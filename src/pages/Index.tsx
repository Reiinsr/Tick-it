import { useState, useEffect } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CreateTicketForm } from '@/components/CreateTicketForm';
import { TicketCard } from '@/components/TicketCard';
import Footer from '@/components/Footer';
import { useToast } from '@/hooks/use-toast';
import { Plus, Search, Settings, LogOut, User, Calendar, Tag } from 'lucide-react';
import { format } from 'date-fns';

const Index = () => {
  const navigate = useNavigate();
  const { user, userProfile, signOut, loading } = useAuth();
  const { toast } = useToast();
  const [tickets, setTickets] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [loadingTickets, setLoadingTickets] = useState(true);

  useEffect(() => {
    console.log('Index useEffect - user:', !!user, 'userProfile:', !!userProfile, 'loading:', loading);
    if (user && userProfile && !loading) {
      console.log('Fetching tickets for user:', userProfile.user_id, 'role:', userProfile.role);
      fetchTickets();
      if (userProfile.role === 'admin' || userProfile.role === 'super_admin') {
        fetchProfiles();
      }
    }
  }, [user, userProfile, loading]);

  const fetchTickets = async () => {
    console.log('fetchTickets called');
    setLoadingTickets(true);
    
    // Don't proceed if userProfile is not available
    if (!userProfile) {
      console.log('No userProfile available, stopping fetchTickets');
      setLoadingTickets(false);
      return;
    }
    
    console.log('Building query for user:', userProfile.user_id, 'role:', userProfile.role);
    let query = supabase
      .from('tickets')
      .select(`
        *,
        requester:requester_id (id, full_name, email),
        assigned_to:assigned_to_id (id, full_name, email)
      `)
      .order('date_created', { ascending: false });

    // Filter tickets based on user role
    if (userProfile.role === 'user') {
      console.log('Filtering for user tickets');
      query = query.eq('requester_id', userProfile.user_id);
    } else if (userProfile.role === 'it_admin') {
      console.log('Filtering for IT admin tickets');
      query = query.eq('category', 'IT');
    } else if (userProfile.role === 'maintenance_admin') {
      console.log('Filtering for maintenance admin tickets');
      query = query.eq('category', 'Maintenance');
    } else if (userProfile.role === 'housekeeping_admin') {
      console.log('Filtering for housekeeping admin tickets');
      query = query.eq('category', 'Housekeeping');
    } else {
      console.log('No filtering applied (admin/super_admin)');
    }
    // Super admins and regular admins can see all tickets (no additional filter)

    try {
      console.log('Executing query...');
      const { data, error } = await query;
      console.log('Query result - data length:', data?.length, 'error:', error);
      if (error) {
        console.error('Error fetching tickets:', error);
        toast({
          title: 'Error',
          description: 'Failed to load tickets.',
          variant: 'destructive',
        });
      } else {
        setTickets(data || []);
        console.log('Tickets set successfully');
      }
    } catch (error) {
      console.error('Unexpected error:', error);
      toast({
        title: 'Error',
        description: 'An unexpected error occurred.',
        variant: 'destructive',
      });
    } finally {
      console.log('Setting loadingTickets to false');
      setLoadingTickets(false);
    }
  };

  const fetchProfiles = async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*');
    if (!error) {
      setProfiles(data || []);
    }
  };

  const handleTicketCreated = () => {
    setShowCreateForm(false);
    fetchTickets();
    toast({
      title: 'Success',
      description: 'Ticket created successfully!',
    });
  };

  const handleStatusChange = async (ticketId: string, newStatus: string) => {
    console.log('Changing status for ticket:', ticketId, 'to:', newStatus, 'by user:', userProfile?.role);
    
    // Check if user has permission to change ticket status
    const canChangeStatus = userProfile?.role === 'admin' || 
                           userProfile?.role === 'super_admin' || 
                           userProfile?.role === 'it_admin' || 
                           userProfile?.role === 'maintenance_admin' || 
                           userProfile?.role === 'housekeeping_admin';
    
    if (!canChangeStatus) {
      toast({
        title: 'Permission Denied',
        description: 'Only admins and category admins can change ticket status.',
        variant: 'destructive',
      });
      return;
    }
    
    const { data, error } = await supabase
      .from('tickets')
      .update({ status: newStatus as 'New' | 'In Progress' | 'On Hold' | 'Completed' })
      .eq('id', ticketId)
      .select();

    if (!error) {
      console.log('Ticket status changed successfully:', data);
      fetchTickets();
      toast({
        title: 'Success',
        description: 'Ticket status updated successfully!',
      });
    } else {
      console.error('Error changing ticket status:', error);
      toast({
        title: 'Error',
        description: `Failed to update ticket status: ${error.message}`,
        variant: 'destructive',
      });
    }
  };

  const handleAssign = async (ticketId: string) => {
    // This would open an assignment dialog - simplified for now
    console.log('Assign ticket:', ticketId);
  };

  const handleSignOut = async () => {
    await signOut();
  };

  const handleAdminSettings = () => {
    navigate('/admin');
  };

  // Filter tickets based on search and filters
  const filteredTickets = tickets.filter(ticket => {
    const matchesSearch = ticket.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         ticket.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         ticket.requester?.full_name?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || ticket.status === statusFilter;
    const matchesCategory = categoryFilter === 'all' || ticket.category === categoryFilter;
    
    return matchesSearch && matchesStatus && matchesCategory;
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (showCreateForm) {
    return (
      <CreateTicketForm
        onCancel={() => setShowCreateForm(false)}
        onSuccess={handleTicketCreated}
        userProfile={userProfile}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold text-gray-900">Tick-it</h1>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <User className="h-4 w-4 text-gray-500" />
                <span className="text-sm text-gray-700">{userProfile?.full_name || userProfile?.email}</span>
                <Badge variant="secondary">{userProfile?.role}</Badge>
              </div>
              
              {userProfile?.role === 'admin' || userProfile?.role === 'super_admin' ? (
                <Button variant="outline" size="sm" onClick={handleAdminSettings}>
                  <Settings className="h-4 w-4 mr-2" />
                  Admin
                </Button>
              ) : null}
              
              <Button variant="outline" size="sm" onClick={handleSignOut}>
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Controls */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
            <div className="flex items-center space-x-4">
              <Button onClick={() => setShowCreateForm(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Ticket
              </Button>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search tickets..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-full sm:w-64"
                />
              </div>
              
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-32">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="New">New</SelectItem>
                  <SelectItem value="In Progress">In Progress</SelectItem>
                  <SelectItem value="On Hold">On Hold</SelectItem>
                  <SelectItem value="Completed">Completed</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-full sm:w-32">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="IT">IT</SelectItem>
                  <SelectItem value="Maintenance">Maintenance</SelectItem>
                  <SelectItem value="Housekeeping">Housekeeping</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Tickets */}
        <div className="space-y-6">
          {loadingTickets ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-gray-500">Loading tickets...</p>
            </div>
          ) : filteredTickets.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-gray-400 mb-4">
                <Tag className="h-12 w-12 mx-auto" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No tickets found</h3>
              <p className="text-gray-500 mb-4">
                {searchTerm || statusFilter !== 'all' || categoryFilter !== 'all'
                  ? 'Try adjusting your filters or search terms.'
                  : 'Get started by creating your first ticket.'}
              </p>
              {!searchTerm && statusFilter === 'all' && categoryFilter === 'all' && (
                <Button onClick={() => setShowCreateForm(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Your First Ticket
                </Button>
              )}
            </div>
          ) : (
            <div className="bg-white shadow-sm rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Ticket
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Category
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Requester
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date Created
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredTickets.map((ticket) => (
                      <tr key={ticket.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => navigate(`/ticket/${ticket.id}`)}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900 line-clamp-1">
                              {ticket.title}
                            </div>
                            {ticket.description && (
                              <div className="text-sm text-gray-500 line-clamp-1">
                                {ticket.description}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Badge 
                            variant="outline" 
                            className={`${
                              ticket.category === 'IT' ? 'bg-purple-100 text-purple-800' :
                              ticket.category === 'Maintenance' ? 'bg-blue-100 text-blue-800' :
                              'bg-green-100 text-green-800'
                            } border-0`}
                          >
                            {ticket.category}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Badge 
                            className={`${
                              ticket.status === 'New' ? 'bg-blue-100 text-blue-800' :
                              ticket.status === 'In Progress' ? 'bg-yellow-100 text-yellow-800' :
                              ticket.status === 'On Hold' ? 'bg-orange-100 text-orange-800' :
                              'bg-green-100 text-green-800'
                            } border-0`}
                          >
                            {ticket.status}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {ticket.requester?.full_name || 'Unknown'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {format(new Date(ticket.date_created), 'MMM d, yyyy')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex space-x-2">
                            {ticket.status !== 'Completed' && userProfile?.role && ['admin', 'super_admin', 'it_admin', 'maintenance_admin', 'housekeeping_admin'].includes(userProfile.role) && (
                              <Button
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const nextStatus = ticket.status === 'New' ? 'In Progress' : 
                                                   ticket.status === 'In Progress' ? 'Completed' : 
                                                   ticket.status === 'On Hold' ? 'In Progress' : 'Completed';
                                  handleStatusChange(ticket.id, nextStatus);
                                }}
                              >
                                {ticket.status === 'New' ? 'Start' : 
                                 ticket.status === 'In Progress' ? 'Complete' : 
                                 ticket.status === 'On Hold' ? 'Resume' : 'Complete'}
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/ticket/${ticket.id}`);
                              }}
                            >
                              View
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Index;
