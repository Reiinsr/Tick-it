import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { ArrowLeft } from 'lucide-react';

interface CreateTicketFormProps {
  onCancel: () => void;
  onSuccess: () => void;
  userProfile: any;
}

export const CreateTicketForm = ({ onCancel, onSuccess, userProfile }: CreateTicketFormProps) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<'IT' | 'Maintenance' | 'Housekeeping' | ''>('');
  const [dueDate, setDueDate] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // Validate that category is selected
    if (!category) {
      alert('Please select a category');
      setLoading(false);
      return;
    }

    // Debug: Check authentication and user profile
    console.log('User profile:', userProfile);
    console.log('Supabase auth session:', await supabase.auth.getSession());

    try {
      // Debug: Log the data being sent
      const ticketData = {
        title: title.trim(),
        description: description.trim(),
        category: category as 'IT' | 'Maintenance' | 'Housekeeping',
        requester_id: userProfile.user_id, // Fixed: use user_id instead of id
        status: 'New' as const
        // Removed due_date and date_created to test if they're the issue
      };
      
      console.log('Sending ticket data:', ticketData);
      
      const { data, error } = await supabase
        .from('tickets')
        .insert(ticketData)
        .select()
        .single();

      if (error) {
        console.error('Error creating ticket:', error);
        alert('Failed to create ticket. Please try again.');
        return;
      }

      // Call the notification function
      try {
        const response = await fetch('https://ibgopagxutjwauxtsmff.supabase.co/functions/v1/notify-category-admins', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImliZ29wYWd4dXRqd2F1eHRzbWZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM3MDMyNjgsImV4cCI6MjA2OTI3OTI2OH0.RVEqrU_jF0ruZuk2rQkN08LHJ2pQBbV_5WYx1JSbsxQ`
          },
          body: JSON.stringify({
            ticketData: {
              id: data.id,
              title: data.title,
              category: data.category,
              description: data.description,
              requester_name: userProfile.full_name,
              date_created: data.date_created
            }
          })
        });

        if (!response.ok) {
          console.warn('Failed to send notification email');
        }
      } catch (notificationError) {
        console.warn('Error sending notification:', notificationError);
        // Don't fail the ticket creation if notification fails
      }

      onSuccess();
    } catch (error) {
      console.error('Error creating ticket:', error);
      alert('Failed to create ticket. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCategoryChange = (value: string) => {
    setCategory(value as 'IT' | 'Maintenance' | 'Housekeeping' | '');
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <Button variant="ghost" onClick={onCancel} className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <h1 className="text-2xl font-bold">Create New Ticket</h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Ticket Details</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                />
              </div>

              <div>
                <Label htmlFor="category">Category</Label>
                <Select value={category} onValueChange={handleCategoryChange} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="IT">IT</SelectItem>
                    <SelectItem value="Maintenance">Maintenance</SelectItem>
                    <SelectItem value="Housekeeping">Housekeeping</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                />
              </div>

              <div>
                <Label htmlFor="dueDate">Due Date (Optional)</Label>
                <Input
                  id="dueDate"
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                />
              </div>

              <div className="flex gap-4">
                <Button type="submit" disabled={loading} className="flex-1">
                  {loading ? 'Creating...' : 'Create Ticket'}
                </Button>
                <Button type="button" variant="outline" onClick={onCancel}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
