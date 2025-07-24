import React, { useState } from 'react';
import { X, Users, Search, Check } from 'lucide-react';
import axios from 'axios';

const CreateGroupModal = ({ users = [], onClose, onGroupCreated }) => {
    const [groupName, setGroupName] = useState('');
    const [selectedUsers, setSelectedUsers] = useState([]);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    const apiUrl = import.meta.env.VITE_API_URL;

    // Filter out AI bot and search functionality
    const filteredUsers = users
        .filter(user => user.id !== 'ai-bot-user') // Exclude AI bot from group creation
        .filter(user => user.name.toLowerCase().includes(searchQuery.toLowerCase()));

    const handleUserToggle = (userId) => {
        setSelectedUsers(prev => 
            prev.includes(userId) 
                ? prev.filter(id => id !== userId) 
                : [...prev, userId]
        );
    };

    const handleCreate = async () => {
        if (!groupName.trim()) {
            setError('Please enter a group name');
            return;
        }
        if (selectedUsers.length < 2) {
            setError('Please select at least 2 members');
            return;
        }
        
        setLoading(true);
        setError('');
        
        try {
            const token = localStorage.getItem('jwt_token');
            const res = await axios.post(`${apiUrl}/api/groups/create`, {
                groupName: groupName.trim(),
                members: selectedUsers
            }, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            onGroupCreated(res.data);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to create group. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter' && !loading) {
            handleCreate();
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] flex flex-col relative animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="p-6 pb-4 border-b border-gray-100">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                                <Users className="text-white" size={20} />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-gray-900">Create Group</h2>
                                <p className="text-sm text-gray-500">Start a new group conversation</p>
                            </div>
                        </div>
                        <button 
                            onClick={onClose}
                            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                            disabled={loading}
                        >
                            <X size={20} className="text-gray-400" />
                        </button>
                    </div>
                </div>

                {/* Group Name Input */}
                <div className="p-6 pb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Group Name
                    </label>
                    <input
                        type="text"
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all placeholder-gray-400"
                        placeholder="Enter group name..."
                        value={groupName}
                        onChange={(e) => setGroupName(e.target.value)}
                        onKeyPress={handleKeyPress}
                        disabled={loading}
                        maxLength={50}
                    />
                    <div className="text-xs text-gray-400 mt-1">
                        {groupName.length}/50 characters
                    </div>
                </div>

                {/* Member Selection */}
                <div className="px-6 pb-4 flex-1 min-h-0">
                    <div className="flex items-center justify-between mb-3">
                        <label className="text-sm font-medium text-gray-700">
                            Add Members ({selectedUsers.length} selected)
                        </label>
                        <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                            Min. 2 required
                        </span>
                    </div>
                    
                    {/* Search Input */}
                    <div className="relative mb-4">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                        <input
                            type="text"
                            placeholder="Search members..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                            disabled={loading}
                        />
                    </div>

                    {/* Members List */}
                    <div className="space-y-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                        {filteredUsers.length === 0 ? (
                            <div className="text-center py-8 text-gray-500">
                                <Users size={32} className="mx-auto mb-2 text-gray-300" />
                                <p className="text-sm">No members found</p>
                            </div>
                        ) : (
                            filteredUsers.map(user => (
                                <label 
                                    key={user.id} 
                                    className={`flex items-center space-x-3 p-3 rounded-xl cursor-pointer transition-all hover:bg-gray-50 ${
                                        selectedUsers.includes(user.id) ? 'bg-blue-50 border border-blue-200' : 'border border-transparent'
                                    }`}
                                >
                                    <div className="relative">
                                        <input
                                            type="checkbox"
                                            checked={selectedUsers.includes(user.id)}
                                            onChange={() => handleUserToggle(user.id)}
                                            disabled={loading}
                                            className="sr-only"
                                        />
                                        <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                                            selectedUsers.includes(user.id) 
                                                ? 'bg-blue-500 border-blue-500' 
                                                : 'border-gray-300 hover:border-gray-400'
                                        }`}>
                                            {selectedUsers.includes(user.id) && (
                                                <Check size={12} className="text-white" />
                                            )}
                                        </div>
                                    </div>
                                    
                                    <div className="relative flex-shrink-0">
                                        <img 
                                            src={user.picture} 
                                            alt={user.name}
                                            referrerPolicy="no-referrer"
                                            className="w-10 h-10 rounded-full object-cover"
                                        />
                                        <div className={`absolute bottom-0 right-0 w-3 h-3 ${
                                            user.isOnline ? 'bg-green-500' : 'bg-gray-400'
                                        } rounded-full border-2 border-white`}></div>
                                    </div>
                                    
                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium text-gray-900 truncate">{user.name}</p>
                                        <p className="text-xs text-gray-500">
                                            {user.isOnline ? 'Online' : 'Offline'}
                                        </p>
                                    </div>
                                </label>
                            ))
                        )}
                    </div>
                </div>

                {/* Error Message */}
                {error && (
                    <div className="px-6 pb-4">
                        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                            <p className="text-red-700 text-sm font-medium">{error}</p>
                        </div>
                    </div>
                )}

                {/* Footer */}
                <div className="p-6 pt-4 border-t border-gray-100">
                    <div className="flex space-x-3">
                        <button
                            onClick={onClose}
                            className="flex-1 px-4 py-3 border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors font-medium"
                            disabled={loading}
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleCreate}
                            disabled={loading || !groupName.trim() || selectedUsers.length < 2}
                            className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-xl hover:from-blue-600 hover:to-purple-600 disabled:from-gray-300 disabled:to-gray-300 disabled:cursor-not-allowed transition-all font-medium flex items-center justify-center space-x-2"
                        >
                            {loading ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                    <span>Creating...</span>
                                </>
                            ) : (
                                <>
                                    <Users size={16} />
                                    <span>Create Group</span>
                                </>
                            )}
                        </button>
                    </div>
                </div>
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

export default CreateGroupModal;