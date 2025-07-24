import React, { useState } from 'react';
import { X, UserPlus, Users, Search, Plus, Loader2 } from 'lucide-react';
import axios from 'axios';

const AddUserToGroupModal = ({ groupId, onClose, onUserAdded }) => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [adding, setAdding] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');

    const apiUrl = import.meta.env.VITE_API_URL;

    React.useEffect(() => {
        const fetchUsers = async () => {
            setLoading(true);
            setError('');
            try {
                const token = localStorage.getItem('jwt_token');
                const res = await axios.get(`${apiUrl}/api/groups/not-in-group/${groupId}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                setUsers(res.data);
            } catch (err) {
                setError(err.response?.data?.message || 'Failed to fetch users. Please try again.');
            } finally {
                setLoading(false);
            }
        };
        fetchUsers();
    }, [groupId]);

    const handleAdd = async (userId) => {
        setAdding(userId);
        setError('');
        try {
            const token = localStorage.getItem('jwt_token');
            await axios.post(`${apiUrl}/api/groups/add-member`, {
                groupId,
                userIdToAdd: userId
            }, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            // Remove the added user from the list
            setUsers(prev => prev.filter(user => user._id !== userId));
            onUserAdded();
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to add user. Please try again.');
        } finally {
            setAdding(null);
        }
    };

    // Filter users based on search query
    const filteredUsers = users.filter(user =>
        user.username.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] flex flex-col relative animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="p-6 pb-4 border-b border-gray-100">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-blue-500 rounded-full flex items-center justify-center">
                                <UserPlus className="text-white" size={20} />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-gray-900">Add Members</h2>
                                <p className="text-sm text-gray-500">Add new people to this group</p>
                            </div>
                        </div>
                        <button 
                            onClick={onClose}
                            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                            disabled={adding !== null}
                        >
                            <X size={20} className="text-gray-400" />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 min-h-0 p-6">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-12">
                            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                            <p className="text-gray-500 font-medium">Loading available users...</p>
                        </div>
                    ) : (
                        <>
                            {/* Search Input */}
                            {users.length > 0 && (
                                <div className="relative mb-6">
                                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                                    <input
                                        type="text"
                                        placeholder="Search users..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                                        disabled={adding !== null}
                                    />
                                </div>
                            )}

                            {/* Users List */}
                            {users.length === 0 ? (
                                <div className="text-center py-12">
                                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <Users size={24} className="text-gray-400" />
                                    </div>
                                    <h3 className="text-lg font-semibold text-gray-900 mb-2">All users added</h3>
                                    <p className="text-gray-500">Everyone is already in this group or no other users are available.</p>
                                </div>
                            ) : filteredUsers.length === 0 ? (
                                <div className="text-center py-8">
                                    <Search size={32} className="mx-auto mb-3 text-gray-300" />
                                    <p className="text-gray-500">No users found matching "{searchQuery}"</p>
                                </div>
                            ) : (
                                <div className="space-y-3 max-h-80 overflow-y-auto pr-2 custom-scrollbar">
                                    {filteredUsers.map(user => (
                                        <div 
                                            key={user._id} 
                                            className="flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 rounded-xl transition-colors"
                                        >
                                            <div className="flex items-center space-x-3">
                                                <div className="relative flex-shrink-0">
                                                    <img 
                                                        src={user.picture} 
                                                        alt={user.username}
                                                        referrerPolicy="no-referrer"
                                                        className="w-10 h-10 rounded-full object-cover"
                                                    />
                                                    <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
                                                </div>
                                                <div>
                                                    <p className="font-medium text-gray-900">{user.username}</p>
                                                    <p className="text-xs text-gray-500">Available to add</p>
                                                </div>
                                            </div>
                                            
                                            <button
                                                onClick={() => handleAdd(user._id)}
                                                disabled={adding !== null}
                                                className={`px-4 py-2 rounded-lg font-medium transition-all flex items-center space-x-2 ${
                                                    adding === user._id
                                                        ? 'bg-blue-100 text-blue-600 cursor-not-allowed'
                                                        : 'bg-gradient-to-r from-green-500 to-blue-500 text-white hover:from-green-600 hover:to-blue-600 hover:shadow-lg transform hover:scale-105'
                                                } ${adding !== null && adding !== user._id ? 'opacity-50 cursor-not-allowed' : ''}`}
                                            >
                                                {adding === user._id ? (
                                                    <>
                                                        <Loader2 size={14} className="animate-spin" />
                                                        <span className="text-sm">Adding...</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <Plus size={14} />
                                                        <span className="text-sm">Add</span>
                                                    </>
                                                )}
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* Error Message */}
                {error && (
                    <div className="px-6 pb-6">
                        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                            <p className="text-red-700 text-sm font-medium">{error}</p>
                        </div>
                    </div>
                )}

                {/* Footer */}
                {!loading && users.length > 0 && (
                    <div className="p-6 pt-0 border-t border-gray-100">
                        <button
                            onClick={onClose}
                            className="w-full px-4 py-3 border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors font-medium"
                            disabled={adding !== null}
                        >
                            {adding !== null ? 'Adding user...' : 'Done'}
                        </button>
                    </div>
                )}
            </div>

            <style jsx>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 4px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: #f1f1f1;
                    border-radius: 2px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: #c1c1c1;
                    border-radius: 2px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: #a8a8a8;
                }
                @keyframes zoom-in-95 {
                    0% {
                        opacity: 0;
                        transform: scale(0.95);
                    }
                    100% {
                        opacity: 1;
                        transform: scale(1);
                    }
                }
                .animate-in {
                    animation-fill-mode: both;
                }
                .zoom-in-95 {
                    animation-name: zoom-in-95;
                }
                .duration-200 {
                    animation-duration: 200ms;
                }
            `}</style>
        </div>
    );
};

export default AddUserToGroupModal;