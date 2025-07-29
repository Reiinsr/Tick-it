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
      console.log('Fetching tickets for user:', userProfile.id, 'role:', userProfile.role);
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
    
    console.log('Building query for user:', userProfile.id, 'role:', userProfile.role);
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
      query = query.eq('requester_id', userProfile.id);
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
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Tag className="h-8 w-8 text-primary mr-3" />
              <h1 className="text-2xl font-bold text-gray-900">Tick-it</h1>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="flex items-center text-sm text-gray-600">
                <User className="h-4 w-4 mr-1" />
                <span className="font-medium">{userProfile?.full_name || user.email}</span>
                {userProfile?.role && userProfile?.role !== 'user' && (
                  <Badge variant="secondary" className="ml-2">
                    {userProfile.role === 'super_admin' ? 'Super Admin' :
                     userProfile.role === 'it_admin' ? 'IT Admin' :
                     userProfile.role === 'maintenance_admin' ? 'Maintenance Admin' :
                     userProfile.role === 'housekeeping_admin' ? 'Housekeeping Admin' :
                     userProfile.role === 'admin' ? 'Admin' : userProfile.role}
                  </Badge>
                )}
              </div>
              
              {(userProfile?.role === 'admin' || ['it_admin', 'maintenance_admin', 'housekeeping_admin'].includes(userProfile?.role)) && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleAdminSettings}
                  className="flex items-center"
                >
                  <Settings className="h-4 w-4 mr-1" />
                  Admin
                </Button>
              )}
              
              <Button
                variant="outline"
                size="sm"
                onClick={handleSignOut}
                className="flex items-center"
              >
                <LogOut className="h-4 w-4 mr-1" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filters and Search */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div className="flex flex-col sm:flex-row gap-4 flex-1">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search tickets..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40">
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
              
              {/* Only show category filter for regular admins and users */}
              {(userProfile?.role === 'admin' || userProfile?.role === 'user') && (
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    <SelectItem value="IT">IT</SelectItem>
                    <SelectItem value="Maintenance">Maintenance</SelectItem>
                    <SelectItem value="Housekeeping">Housekeeping</SelectItem>
                  </SelectContent>
                </Select>
              )}
            </div>
            
            <Button onClick={() => setShowCreateForm(true)} className="flex items-center">
              <Plus className="h-4 w-4 mr-2" />
              New Ticket
            </Button>
          </div>
        </div>

        {/* Tickets List */}
        {loadingTickets ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p>Loading tickets...</p>
          </div>
        ) : filteredTickets.length === 0 ? (
          <div className="text-center py-12">
            <Tag className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {searchTerm || statusFilter !== 'all' || categoryFilter !== 'all' 
                ? 'No tickets match your filters' 
                : 'No tickets yet'}
            </h3>
            <p className="text-gray-600 mb-4">
              {searchTerm || statusFilter !== 'all' || categoryFilter !== 'all'
                ? 'Try adjusting your search or filters'
                : 'Get started by creating your first ticket'}
            </p>
            {(!searchTerm && statusFilter === 'all' && categoryFilter === 'all') && (
              <Button onClick={() => setShowCreateForm(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create First Ticket
              </Button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white border rounded shadow text-sm">
              <thead>
                <tr>
                  <th className="px-4 py-2 border-b">Title</th>
                  <th className="px-4 py-2 border-b">Category</th>
                  <th className="px-4 py-2 border-b">Description</th>
                  <th className="px-4 py-2 border-b">Requester</th>
                  <th className="px-4 py-2 border-b">Status</th>
                  <th className="px-4 py-2 border-b">Assigned To</th>
                  <th className="px-4 py-2 border-b">Date Created</th>
                  <th className="px-4 py-2 border-b">Due Date</th>
                </tr>
              </thead>
              <tbody>
                {filteredTickets.map((ticket) => (
                  <tr key={ticket.id}>
                    <td className="px-4 py-2 border-b font-medium">{ticket.title}</td>
                    <td className="px-4 py-2 border-b">{ticket.category}</td>
                    <td className="px-4 py-2 border-b max-w-xs truncate" title={ticket.description}>{ticket.description}</td>
                    <td className="px-4 py-2 border-b">{ticket.requester?.full_name || 'Unknown'}</td>
                    <td className="px-4 py-2 border-b">
                       {(userProfile?.role === 'admin' || ['it_admin', 'maintenance_admin', 'housekeeping_admin'].includes(userProfile?.role)) ? (
                         <select
                           className="border rounded px-2 py-1"
                           value={ticket.status}
                           onChange={e => handleStatusChange(ticket.id, e.target.value)}
                         >
                           <option value="New">New</option>
                           <option value="In Progress">In Progress</option>
                           <option value="On Hold">On Hold</option>
                           <option value="Completed">Completed</option>
                         </select>
                       ) : (
                         ticket.status
                       )}
                     </td>
                    <td className="px-4 py-2 border-b">{ticket.assigned_to?.full_name || 'Unassigned'}</td>
                    <td className="px-4 py-2 border-b">{ticket.date_created ? new Date(ticket.date_created).toLocaleDateString() : ''}</td>
                    <td className="px-4 py-2 border-b">{ticket.due_date ? new Date(ticket.due_date).toLocaleDateString() : ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default Index;