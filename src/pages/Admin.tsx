import { useEffect, useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Footer from '@/components/Footer';
import { ArrowLeft, User, Tag, Settings as SettingsIcon, ClipboardList, Users } from 'lucide-react';

const TABS = [
  { key: 'dashboard', label: 'Dashboard', icon: <Tag className="h-4 w-4 mr-1" /> },
  { key: 'tickets', label: 'Tickets', icon: <ClipboardList className="h-4 w-4 mr-1" /> },
  { key: 'users', label: 'Users', icon: <Users className="h-4 w-4 mr-1" /> },
  { key: 'settings', label: 'Settings', icon: <SettingsIcon className="h-4 w-4 mr-1" /> },
];

const Admin = () => {
  const navigate = useNavigate();
  const { user, userProfile, loading } = useAuth();
  const [profiles, setProfiles] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [loadingData, setLoadingData] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [hideAdminSignup, setHideAdminSignup] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);

  useEffect(() => {
    if (userProfile?.role === 'admin') {
      fetchProfiles();
      fetchTickets();
      fetchAdminSettings();
    }
  }, [userProfile]);

  const fetchProfiles = async () => {
    const { data, error } = await supabase.from('profiles').select('*');
    if (!error) setProfiles(data || []);
  };

  const fetchTickets = async () => {
    const { data, error } = await supabase
      .from('tickets')
      .select(`*, requester:requester_id (id, full_name, email), assigned_to:assigned_to_id (id, full_name, email)`)
      .order('date_created', { ascending: false });
    if (!error) setTickets(data || []);
    setLoadingData(false);
  };

  const fetchAdminSettings = async () => {
    const { data, error } = await supabase
      .from('admin_settings')
      .select('*')
      .eq('key', 'hide_admin_signup')
      .maybeSingle();
    if (!error && data) setHideAdminSignup(data.value === 'true');
  };

  const handleRoleChange = async (userId, newRole) => {
    await supabase.from('profiles').update({ role: newRole }).eq('user_id', userId);
    fetchProfiles();
  };

  const handleAssign = async (ticketId, assignedToId) => {
    await supabase.from('tickets').update({ assigned_to_id: assignedToId }).eq('id', ticketId);
    fetchTickets();
  };

  const handleHideAdminSignupToggle = async () => {
    setSavingSettings(true);
    const newValue = !hideAdminSignup;
    console.log('Upserting hide_admin_signup with value:', newValue ? 'true' : 'false');
    const { error } = await supabase.from('admin_settings').upsert({
      id: '1779b168-3ba7-48a0-a3bf-58f2cdd16259',
      key: 'hide_admin_signup',
      value: newValue ? 'true' : 'false'
    });
    if (error) {
      console.error('Upsert error:', error);
    } else {
      setHideAdminSignup(newValue);
    }
    setSavingSettings(false);
  };

  if (loading || loadingData) {
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

  if (userProfile?.role !== 'admin') {
    return <Navigate to="/" replace />;
  }

  // Ticket stats
  const ticketStats = {
    total: tickets.length,
    new: tickets.filter(t => t.status === 'New').length,
    inProgress: tickets.filter(t => t.status === 'In Progress').length,
    onHold: tickets.filter(t => t.status === 'On Hold').length,
    completed: tickets.filter(t => t.status === 'Completed').length,
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center h-16">
          <Button variant="ghost" onClick={() => navigate('/')} className="mr-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <Tag className="h-8 w-8 text-primary mr-3" />
          <h1 className="text-2xl font-bold text-gray-900">Admin Settings</h1>
        </div>
      </header>
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8 flex gap-2 border-b pb-2">
          {TABS.map(tab => (
            <Button
              key={tab.key}
              variant={activeTab === tab.key ? 'default' : 'outline'}
              onClick={() => setActiveTab(tab.key)}
              className="flex items-center"
            >
              {tab.icon}
              {tab.label}
            </Button>
          ))}
        </div>
        {activeTab === 'dashboard' && (
          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">Ticket Overview</h2>
            <div className="flex gap-4 mb-6">
              <Badge>Total: {ticketStats.total}</Badge>
              <Badge variant="outline">New: {ticketStats.new}</Badge>
              <Badge variant="outline">In Progress: {ticketStats.inProgress}</Badge>
              <Badge variant="outline">On Hold: {ticketStats.onHold}</Badge>
              <Badge variant="outline">Completed: {ticketStats.completed}</Badge>
            </div>
          </section>
        )}
        {activeTab === 'tickets' && (
          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">Tickets List</h2>
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
                    <th className="px-4 py-2 border-b">Actions</th>
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
                      <td className="px-4 py-2 border-b">
                        <select
                          className="border rounded px-2 py-1"
                          value={ticket.assigned_to?.id || ''}
                          onChange={e => handleAssign(ticket.id, e.target.value)}
                        >
                          <option value="">Unassigned</option>
                          {profiles.map(profile => (
                            <option key={profile.id} value={profile.id}>
                              {profile.full_name} ({profile.role})
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-2 border-b">{ticket.date_created ? new Date(ticket.date_created).toLocaleDateString() : ''}</td>
                      <td className="px-4 py-2 border-b">{ticket.due_date ? new Date(ticket.due_date).toLocaleDateString() : ''}</td>
                      <td className="px-4 py-2 border-b">
                        {/* Future: Add more actions here */}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
        {activeTab === 'users' && (
          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">User Management</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full bg-white border rounded shadow">
                <thead>
                  <tr>
                    <th className="px-4 py-2 border-b">Name</th>
                    <th className="px-4 py-2 border-b">Email</th>
                    <th className="px-4 py-2 border-b">Role</th>
                    <th className="px-4 py-2 border-b">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {profiles.map((profile) => (
                    <tr key={profile.id}>
                      <td className="px-4 py-2 border-b flex items-center">
                        <User className="h-4 w-4 mr-2" />
                        {profile.full_name || 'No Name'}
                      </td>
                      <td className="px-4 py-2 border-b">{profile.email}</td>
                      <td className="px-4 py-2 border-b">
                        <Badge variant={profile.role === 'admin' ? 'secondary' : 'outline'}>{profile.role}</Badge>
                      </td>
                      <td className="px-4 py-2 border-b">
                        {profile.role !== 'admin' ? (
                          <Button size="sm" onClick={() => handleRoleChange(profile.user_id, 'admin')}>
                            Make Admin
                          </Button>
                        ) : (
                          <span className="text-gray-400 text-xs">Admin</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
        {activeTab === 'settings' && (
          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">Admin Settings</h2>
            <div className="flex items-center gap-4">
              <span>Show Admin Sign Up Button:</span>
              <Button
                variant={hideAdminSignup ? 'outline' : 'default'}
                onClick={handleHideAdminSignupToggle}
                disabled={savingSettings}
              >
                {hideAdminSignup ? 'Hide' : 'Show'}
              </Button>
              {savingSettings && <span className="text-xs text-gray-500 ml-2">Saving...</span>}
            </div>
          </section>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default Admin; 