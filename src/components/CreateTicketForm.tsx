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

    // Debug: Check authentication and user profile
    console.log('User profile:', userProfile);
    console.log('Supabase auth session:', await supabase.auth.getSession());

    try {
      // Debug: Log the data being sent
      const ticketData = {
        title: title.trim(),
        description: description.trim(),
        category: category as 'IT' | 'Maintenance' | 'Housekeeping',
        due_date: dueDate ? new Date(dueDate).toISOString() : null,
        requester_id: userProfile.id,
        status: 'New' as const,
        date_created: new Date().toISOString() // Add explicit date_created
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
        const response = await fetch('/api/notify-category-admins', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            ticketData: {
              id: data.id,
              title: data.title,
              category: data.category,
              description: data.description,
              requester_name: userProfile.full_name,
              date_created: data.date_created,
              priority: data.priority
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
                <Select value={category} onValueChange={setCategory} required>
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