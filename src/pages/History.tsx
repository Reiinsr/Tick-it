import { useState, useEffect } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import Footer from '@/components/Footer';
import { ArrowLeft, Calendar } from 'lucide-react';

const History = () => {
  const navigate = useNavigate();
  const { user, userProfile, loading } = useAuth();
  const [tickets, setTickets] = useState([]);
  const [loadingTickets, setLoadingTickets] = useState(true);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    if (userProfile?.role && userProfile?.role !== 'user') {
      fetchTickets();
    }
  }, [userProfile, startDate, endDate]);

  const fetchTickets = async () => {
    setLoadingTickets(true);
    let query = supabase
      .from('tickets')
      .select(`
        *,
        requester:requester_id (id, full_name, email),
        assigned_to:assigned_to_id (id, full_name, email)
      `)
      .order('date_created', { ascending: false });

    // Filter tickets based on user role
    if (userProfile?.role === 'it_admin') {
      query = query.eq('category', 'IT');
    } else if (userProfile?.role === 'maintenance_admin') {
      query = query.eq('category', 'Maintenance');
    } else if (userProfile?.role === 'housekeeping_admin') {
      query = query.eq('category', 'Housekeeping');
    }
    // Regular admins can see all tickets

    // Add date range filtering
    if (startDate) {
      query = query.gte('date_created', startDate);
    }
    if (endDate) {
      query = query.lte('date_created', endDate);
    }

    const { data, error } = await query;
    if (!error) {
      setTickets(data || []);
    }
    setLoadingTickets(false);
  };

  if (loading || loadingTickets) {
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

  // Allow access to admins and category admins
  const isAdmin = userProfile?.role === 'admin';
  const isCategoryAdmin = ['it_admin', 'maintenance_admin', 'housekeeping_admin'].includes(userProfile?.role);
  
  if (!isAdmin && !isCategoryAdmin) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center h-16">
          <Button variant="ghost" onClick={() => navigate('/')} className="mr-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <Calendar className="h-8 w-8 text-primary mr-3" />
          <h1 className="text-2xl font-bold text-gray-900">
            {isAdmin ? 'Ticket History' : `${userProfile?.role === 'it_admin' ? 'IT' : userProfile?.role === 'maintenance_admin' ? 'Maintenance' : 'Housekeeping'} Ticket History`}
          </h1>
        </div>
      </header>
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Date Range Filter */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4">Filter by Date Range</h2>
          <div className="flex gap-4 items-end">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">From Date</label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-48"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">To Date</label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-48"
              />
            </div>
            <Button onClick={fetchTickets} className="flex items-center">
              <Calendar className="h-4 w-4 mr-2" />
              Filter
            </Button>
          </div>
        </div>

        {/* Tickets List */}
        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-4">
            {isAdmin ? 'Historical Tickets' : `${userProfile?.role === 'it_admin' ? 'IT' : userProfile?.role === 'maintenance_admin' ? 'Maintenance' : 'Housekeeping'} Historical Tickets`}
          </h2>
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
                {tickets.map((ticket) => (
                  <tr key={ticket.id}>
                    <td className="px-4 py-2 border-b font-medium">{ticket.title}</td>
                    <td className="px-4 py-2 border-b">{ticket.category}</td>
                    <td className="px-4 py-2 border-b max-w-xs truncate" title={ticket.description}>{ticket.description}</td>
                    <td className="px-4 py-2 border-b">{ticket.requester?.full_name || 'Unknown'}</td>
                    <td className="px-4 py-2 border-b">{ticket.status}</td>
                    <td className="px-4 py-2 border-b">{ticket.assigned_to?.full_name || 'Unassigned'}</td>
                    <td className="px-4 py-2 border-b">{ticket.date_created ? new Date(ticket.date_created).toLocaleDateString() : ''}</td>
                    <td className="px-4 py-2 border-b">{ticket.due_date ? new Date(ticket.due_date).toLocaleDateString() : ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {tickets.length === 0 && (
            <div className="text-center py-12">
              <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No tickets found</h3>
              <p className="text-gray-600">Try adjusting your date range or filters.</p>
            </div>
          )}
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default History; 