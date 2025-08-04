import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, User, Tag, Clock, ExternalLink } from 'lucide-react';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';

interface TicketCardProps {
  ticket: {
    id: string;
    title: string;
    category: string;
    description: string;
    status: string;
    date_created: string;
    due_date?: string;
    requester: {
      full_name: string;
      email: string;
    };
    assigned_to?: {
      full_name: string;
      email: string;
    };
  };
  onStatusChange: (ticketId: string, newStatus: string) => void;
  onAssign?: (ticketId: string) => void;
  userProfile: any;
}

const statusColors = {
  'New': 'bg-blue-100 text-blue-800',
  'In Progress': 'bg-yellow-100 text-yellow-800',
  'On Hold': 'bg-orange-100 text-orange-800',
  'Completed': 'bg-green-100 text-green-800'
};

const categoryColors = {
  'IT': 'bg-purple-100 text-purple-800',
  'Maintenance': 'bg-blue-100 text-blue-800',
  'Housekeeping': 'bg-green-100 text-green-800'
};

export const TicketCard = ({ ticket, onStatusChange, onAssign, userProfile }: TicketCardProps) => {
  const navigate = useNavigate();

  const getNextStatus = (currentStatus: string) => {
    const statusFlow = {
      'New': 'In Progress',
      'In Progress': 'Completed',
      'On Hold': 'In Progress',
      'Completed': 'Completed'
    };
    return statusFlow[currentStatus as keyof typeof statusFlow];
  };

  const canProgress = ticket.status !== 'Completed';
  
  // Check if user can change ticket status (only admins and category admins)
  const canChangeStatus = userProfile?.role === 'admin' || 
                         userProfile?.role === 'super_admin' || 
                         userProfile?.role === 'it_admin' || 
                         userProfile?.role === 'maintenance_admin' || 
                         userProfile?.role === 'housekeeping_admin';

  const handleCardClick = () => {
    navigate(`/ticket/${ticket.id}`);
  };

  return (
    <Card className="w-full hover:shadow-md transition-shadow cursor-pointer" onClick={handleCardClick}>
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <CardTitle className="text-lg font-semibold mb-2 line-clamp-2">
              {ticket.title}
            </CardTitle>
            <div className="flex flex-wrap gap-2 mb-2">
              <Badge 
                className={`${statusColors[ticket.status as keyof typeof statusColors]} border-0`}
              >
                {ticket.status}
              </Badge>
              <Badge 
                variant="outline" 
                className={`${categoryColors[ticket.category as keyof typeof categoryColors]} border-0`}
              >
                {ticket.category}
              </Badge>
            </div>
          </div>
        </div>
        
        {ticket.description && (
          <p className="text-sm text-gray-600 line-clamp-2 mb-3">
            {ticket.description}
          </p>
        )}
      </CardHeader>
      
      <CardContent className="pt-0">
        <div className="space-y-2 text-sm text-gray-600">
          <div className="flex items-center">
            <User className="h-4 w-4 mr-2" />
            <span className="font-medium">Requester:</span>
            <span className="ml-1">{ticket.requester?.full_name || 'Unknown'}</span>
          </div>
          
          {ticket.assigned_to && (
            <div className="flex items-center">
              <User className="h-4 w-4 mr-2" />
              <span className="font-medium">Assigned to:</span>
              <span className="ml-1">{ticket.assigned_to.full_name}</span>
            </div>
          )}
          
          <div className="flex items-center">
            <Calendar className="h-4 w-4 mr-2" />
            <span className="font-medium">Created:</span>
            <span className="ml-1">{format(new Date(ticket.date_created), 'MMM d, yyyy')}</span>
          </div>
          
          {ticket.due_date && (
            <div className="flex items-center">
              <Clock className="h-4 w-4 mr-2" />
              <span className="font-medium">Due:</span>
              <span className="ml-1">{format(new Date(ticket.due_date), 'MMM d, yyyy')}</span>
            </div>
          )}
        </div>
        
        <div className="flex gap-2 mt-4">
          {canProgress && canChangeStatus && (
            <Button
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onStatusChange(ticket.id, getNextStatus(ticket.status));
              }}
              className="flex-1"
            >
              Mark as {getNextStatus(ticket.status)}
            </Button>
          )}
          
          <Button
            size="sm"
            variant="outline"
            onClick={(e) => {
              e.stopPropagation();
              handleCardClick();
            }}
            className="flex items-center"
          >
            <ExternalLink className="h-4 w-4 mr-1" />
            View
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};