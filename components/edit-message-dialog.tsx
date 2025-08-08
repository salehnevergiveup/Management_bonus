"use client"

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useLanguage } from '@app/contexts/LanguageContext';
import { t } from '@app/lib/i18n';
import { extractPlaceholders, getMessagePreview } from '@/lib/messageProcessor';

interface Endpoint {
  key: string;
  name: string;
  description: string;
}

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

interface EditMessageDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    message: string;
    is_active: boolean;
  }) => void;
  message: SmsMessage;
  endpoints: Endpoint[];
}

const EditMessageDialog: React.FC<EditMessageDialogProps> = ({
  isOpen,
  onClose,
  onSubmit,
  message,
  endpoints
}) => {
  const { lang } = useLanguage();
  const [formData, setFormData] = useState({
    message: '',
    is_active: false
  });

  useEffect(() => {
    if (message) {
      setFormData({
        message: message.message,
        is_active: message.is_active
      });
    }
  }, [message]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const placeholders = extractPlaceholders(formData.message);
  const preview = getMessagePreview(formData.message, {
    playerId: '123456',
    unclaimAmount: '1000',
    bonus_type: 'Extra',
    custom_field: 'Sample Value'
  });

  const endpoint = endpoints.find(ep => ep.key === message.endpoint);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Edit SMS Message</DialogTitle>
          <DialogDescription>
            Edit the dynamic SMS message template for {endpoint?.name || message.endpoint}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">


          <div>
            <Label htmlFor="message">Message Template</Label>
            <Textarea
              id="message"
              value={formData.message}
              onChange={(e) => setFormData({ ...formData, message: e.target.value })}
              placeholder="Enter message template with placeholders like {{playerId}}, {{unclaimAmount}}, etc."
              rows={6}
              required
            />
            <div className="text-sm text-gray-500 mt-2 space-y-1">
              <p><strong>Placeholder Format:</strong></p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li><code className="bg-gray-100 px-1 rounded">{"{{playerId}}"}</code> - Basic placeholder</li>
                <li><code className="bg-gray-100 px-1 rounded">{"{{playerId??Player}}"}</code> - With fallback value</li>
                <li><code className="bg-gray-100 px-1 rounded">{"{{unclaimAmount??0}}"}</code> - Number with default</li>
              </ul>
              <p className="mt-2 text-xs">
                <strong>Note:</strong> Use double braces {"{{}}"} and {"??"} for fallback values. 
                If the placeholder value is empty or missing, the fallback will be used.
              </p>
            </div>
          </div>

          {placeholders.length > 0 && (
            <div>
              <Label>Detected Placeholders</Label>
              <div className="flex flex-wrap gap-2 mt-1">
                {placeholders.map((placeholder) => (
                  <span
                    key={placeholder}
                    className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded"
                  >
                    {placeholder}
                  </span>
                ))}
              </div>
            </div>
          )}

          {formData.message && (
            <div>
              <Label>Preview</Label>
              <div className="mt-1 p-3 bg-gray-50 rounded text-sm whitespace-pre-wrap">
                {preview}
              </div>
            </div>
          )}

          <div className="flex items-center space-x-2">
            <Checkbox
              id="is_active"
              checked={formData.is_active}
              onCheckedChange={(checked) => 
                setFormData({ ...formData, is_active: checked as boolean })
              }
            />
            <Label htmlFor="is_active">Set as active message for this endpoint</Label>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={!formData.message}>
              Update Message
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EditMessageDialog; 