"use client"

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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

interface CreateMessageDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    endpoint: string;
    message: string;
    is_active: boolean;
  }) => void;
  endpoints: Endpoint[];
}

const CreateMessageDialog: React.FC<CreateMessageDialogProps> = ({
  isOpen,
  onClose,
  onSubmit,
  endpoints
}) => {
  const { lang } = useLanguage();
  const [formData, setFormData] = useState({
    endpoint: '',
    message: '',
    is_active: false
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const handleReset = () => {
    setFormData({
      endpoint: '',
      message: '',
      is_active: false
    });
  };

  const placeholders = extractPlaceholders(formData.message);
  const preview = getMessagePreview(formData.message, {
    playerId: '123456',
    unclaimAmount: '1000',
    bonus_type: 'Extra',
    custom_field: 'Sample Value'
  });

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Create SMS Message</DialogTitle>
          <DialogDescription>
            Create a new dynamic SMS message template with placeholders
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="endpoint">Endpoint</Label>
              <Select
                value={formData.endpoint}
                onValueChange={(value) => setFormData({ ...formData, endpoint: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select endpoint" />
                </SelectTrigger>
                <SelectContent>
                  {endpoints.map((endpoint) => (
                    <SelectItem key={endpoint.key} value={endpoint.key}>
                      {endpoint.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>


          </div>

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
            <Button type="button" variant="outline" onClick={handleReset}>
              Reset
            </Button>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={!formData.endpoint || !formData.message}>
              Create Message
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateMessageDialog; 