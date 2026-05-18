import React, { useEffect, useState } from 'react';
import { supabase } from '../supabase/client';
import { formatDate } from '../utils/constants';

const StaffList = () => {
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStaff();
  }, []);

  const fetchStaff = async () => {
    const { data, error } = await supabase
      .from('staff')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching staff:', error);
    } else {
      setStaff(data);
    }
    setLoading(false);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this staff member?')) return;

    const { error } = await supabase.from('staff').delete().eq('id', id);
    if (!error) {
      setStaff(staff.filter(member => member.id !== id));
    } else {
      alert('Error deleting');
    }
  };

  if (loading) return <div>Loading Staff...</div>;

  return (
    <div className="view active">
      <div className="table-card">
        <div className="table-toolbar">
          <span className="ttitle">All Staff Members</span>
          <button className="btn btn-blue btn-sm">+ Add Staff</button>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Role</th>
                <th>Email</th>
                <th>DBS Expiry</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {staff.map((member) => (
                <tr key={member.id}>
                  <td>
                    <strong>{member.first_name} {member.last_name}</strong>
                  </td>
                  <td>
                    <span className="badge bg-navy">{member.role}</span>
                  </td>
                  <td>{member.email}</td>
                  <td>{formatDate(member.dbs_expiry)}</td>
                  <td>
                    <button 
                      className="btn btn-danger btn-sm"
                      onClick={() => handleDelete(member.id)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default StaffList;