"use client"

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/badge';
import { AppColor } from '@/constants/enums';
import { Plus, Edit, Trash2, MessageSquare, AlertTriangle } from 'lucide-react';
import CreateMessageDialog from '@/components/create-message-dialog';
import EditMessageDialog from '@/components/edit-message-dialog';

interface SmsMessage {
  id: string;
  endpoint: string;
  message: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by?: string;
  updated_by?: string;
}

const BroadcastingPage = () => {
  const [messages, setMessages] = useState<SmsMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingMessage, setEditingMessage] = useState<SmsMessage | null>(null);

  const endpoints = [
    { key: 'rewardreach', name: 'Reward Reach SMS', description: 'SMS for reward claiming' },
    { key: 'unclaim', name: 'Unclaim SMS', description: 'SMS for unclaimed balance' }
  ];

  useEffect(() => {
    fetchMessages();
  }, []);

  const fetchMessages = async () => {
    try {
      const response = await fetch('/api/sms-messages');
      if (response.ok) {
        const data = await response.json();
        setMessages(data.messages || []);
      } else if (response.status === 401) {
        // Handle authentication error gracefully
        console.log('User not authenticated, showing empty state');
        setMessages([]);
      } else {
        console.error('Error fetching messages:', response.status);
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateMessage = async (messageData: { endpoint: string; message: string; is_active: boolean }) => {
    try {
      const response = await fetch('/api/sms-messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(messageData)
      });

      if (response.ok) {
        await fetchMessages();
        setShowCreateDialog(false);
      }
    } catch (error) {
      console.error('Error creating message:', error);
    }
  };

  const handleUpdateMessage = async (id: string, messageData: Partial<SmsMessage>) => {
    try {
      const response = await fetch(`/api/sms-messages/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(messageData)
      });

      if (response.ok) {
        await fetchMessages();
        setEditingMessage(null);
      }
    } catch (error) {
      console.error('Error updating message:', error);
    }
  };

  const handleDeleteMessage = async (id: string) => {
    if (!confirm('Are you sure you want to delete this message?')) return;

    try {
      const response = await fetch(`/api/sms-messages/${id}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        await fetchMessages();
      }
    } catch (error) {
      console.error('Error deleting message:', error);
    }
  };

  const getActiveMessage = (endpoint: string) => {
    return messages.find(msg => msg.endpoint === endpoint && msg.is_active);
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Broadcasting</h1>
          <p className="text-gray-600">Manage dynamic SMS messages for different endpoints</p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Create Message
        </Button>
      </div>

      {/* Endpoints Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {endpoints.map((endpoint) => {
          const activeMessage = getActiveMessage(endpoint.key);
          
          return (
            <Card key={endpoint.key}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <MessageSquare className="w-5 h-5" />
                      {endpoint.name}
                    </CardTitle>
                    <CardDescription>{endpoint.description}</CardDescription>
                  </div>
                  <Badge 
                    color={activeMessage ? AppColor.SUCCESS : AppColor.WARNING}
                    text={activeMessage ? 'Active' : 'No Active Message'}
                  />
                </div>
              </CardHeader>
              <CardContent>
                {activeMessage ? (
                  <div className="space-y-3">
                    <div>
                      <h4 className="font-medium mb-2">Active Message:</h4>
                      <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded">
                        {activeMessage.message}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setEditingMessage(activeMessage)}
                      >
                        <Edit className="w-4 h-4 mr-1" />
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowCreateDialog(true)}
                      >
                        <Plus className="w-4 h-4 mr-1" />
                        Create New
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-yellow-600">
                    <AlertTriangle className="w-4 h-4" />
                    <span className="text-sm">
                      No active message selected for {endpoint.name}. Please select or create one.
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Messages List */}
      <Card>
        <CardHeader>
          <CardTitle>All Messages</CardTitle>
          <CardDescription>Manage all SMS message templates</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {messages.map((message) => (
              <div key={message.id} className="border rounded-lg p-4">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-medium">{message.endpoint}</h3>
                      <Badge 
                        color={message.is_active ? AppColor.SUCCESS : AppColor.WARNING}
                        text={message.is_active ? 'Active' : 'Inactive'}
                      />
                      <span className="text-sm text-gray-500">({message.endpoint})</span>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">{message.message}</p>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setEditingMessage(message)}
                      >
                        <Edit className="w-4 h-4 mr-1" />
                        Edit
                      </Button>
                      {!message.is_active && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteMessage(message.id)}
                        >
                          <Trash2 className="w-4 h-4 mr-1" />
                          Delete
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
            {messages.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                No messages created yet. Create your first message to get started.
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Dialogs */}
      {showCreateDialog && (
        <CreateMessageDialog
          isOpen={showCreateDialog}
          onClose={() => setShowCreateDialog(false)}
          onSubmit={handleCreateMessage}
          endpoints={endpoints}
        />
      )}

      {editingMessage && (
        <EditMessageDialog
          isOpen={!!editingMessage}
          onClose={() => setEditingMessage(null)}
          onSubmit={(data: { message: string; is_active: boolean }) => handleUpdateMessage(editingMessage.id, data)}
          message={editingMessage}
          endpoints={endpoints}
        />
      )}
    </div>
  );
};

export default BroadcastingPage; 