import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Search, MessageCircle, LogOut, Users } from 'lucide-react';
import Chat from './Chat';
import Profile from './Profile';
import CallModal from './CallModal';
import IncomingCallNotification from './IncomingCallNotification';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { initSocket, getSocket, disconnectSocket } from './socket';
import { jwtDecode } from 'jwt-decode';
import CreateGroupModal from './CreateGroupModal';

const App = () => {
    const [selectedUser, setSelectedUser] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [users, setUsers] = useState([]);
    const [groups, setGroups] = useState([]);
    const navigate = useNavigate();
    const [socket, setSocket] = useState(null);
    
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
    const [showChat, setShowChat] = useState(false);

    const [viewingProfileOf, setViewingProfileOf] = useState(null);

    const [callDetails, setCallDetails] = useState(null);
    const [incomingCallDetails, setIncomingCallDetails] = useState(null);
    const [showCreateGroup, setShowCreateGroup] = useState(false);

    const apiUrl = import.meta.env.VITE_API_URL;

    useEffect(() => {
        const handleResize = () => {
            const mobile = window.innerWidth < 768;
            setIsMobile(mobile);
            if (!mobile) {
                setShowChat(false);
            }
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);
    
    const myInfo = useMemo(() => {
        const token = localStorage.getItem('jwt_token');
        return token ? jwtDecode(token) : null;
    }, []);

    useEffect(() => {
        if (!myInfo) {
            navigate('/');
            return;
        }
        initSocket(localStorage.getItem('jwt_token'));
        const socketInstance = getSocket();
        setSocket(socketInstance);
        
        const handleUnload = () => disconnectSocket();
        window.addEventListener('beforeunload', handleUnload);
        
        return () => {
            window.removeEventListener('beforeunload', handleUnload);
            disconnectSocket(); 
        };
    }, [navigate, myInfo]);

    const fetchUsers = useCallback(async () => {
        const aiBotUser = {
            id: 'ai-bot-user',
            name: 'YourAI',
            picture: 'https://api.dicebear.com/8.x/bottts-neutral/svg?seed=YourAI', 
            isOnline: true,
            lastMessage: "Ask me anything!",
            lastMessageTimestamp: new Date().toISOString()
        };
        try {
            const token = localStorage.getItem('jwt_token');
            const res = await axios.get(`${apiUrl}/users`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            setUsers([aiBotUser, ...res.data]);
        } catch (err) {
            console.error('Failed to fetch users:', err);
            setUsers([aiBotUser]);
        }
    }, []);

    const fetchGroups = useCallback(async () => {
        const token = localStorage.getItem('jwt_token');
        if (!token) return;
        try {
            const res = await axios.get(`${apiUrl}/api/groups/my-groups`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            setGroups(res.data);
            setSelectedUser(prev => {
                if (prev && prev.isGroup && !res.data.some(g => g._id === prev.id)) {
                    return null;
                }
                return prev;
            });
        } catch (err) {
            setGroups([]);
            setSelectedUser(prev => (prev && prev.isGroup ? null : prev));
        }
    }, []);

    useEffect(() => {
        if (!socket) return;

        fetchUsers();

        const handleUserOnline = ({ userId }) => {
            setUsers(prev => prev.map(user => user.id === userId ? { ...user, isOnline: true } : user));
        };
        const handleUserOffline = ({ userId }) => {
            setUsers(prev => prev.map(user => user.id === userId ? { ...user, isOnline: false } : user));
        };
        const handleNewMessage = ({ msg, from, type }) => {
            setUsers(prevUsers => {
                const updatedUsers = prevUsers.map(user => {
                    if (user.id === from.id) {
                        return {
                            ...user,
                            lastMessage: type === 'image' ? '📷 Photo' : msg,
                            lastMessageTimestamp: new Date().toISOString()
                        };
                    }
                    return user;
                });
                return updatedUsers.sort((a, b) => {
                    if (!a.lastMessageTimestamp) return 1;
                    if (!b.lastMessageTimestamp) return -1;
                    return new Date(b.lastMessageTimestamp) - new Date(a.lastMessageTimestamp);
                });
            });
        };
        const handleGroupMessage = ({ msg, groupId, from, type }) => {
            setGroups(prevGroups => prevGroups.map(group =>
                group._id === groupId
                    ? {
                        ...group,
                        lastMessage: { content: msg, type: type || 'text', sender: from }
                    }
                    : group
            ));
        };
        
        const handleNewUser = () => {
            console.log("A new user has registered. Refreshing user list...");
            fetchUsers();
        };

        const handleGroupCreated = ({ group }) => {
            setGroups(prevGroups => {
                const groupExists = prevGroups.some(g => g._id === group._id);
                if (groupExists) {
                    return prevGroups;
                }
                return [group, ...prevGroups];
            });
        };
        
        const handleIncomingCall = ({ offer, from, callType }) => {
            setIncomingCallDetails({ type: 'incoming', peer: from, offer, callType: callType });
        };
        const handleCallEnded = () => {
            setCallDetails(null);
            setIncomingCallDetails(null);
        };
        const handleCallDeclined = () => {
            alert(`${callDetails?.peer?.username || 'The user'} declined your call.`);
            setCallDetails(null);
        };
        const handleGroupUpdated = () => {
            fetchGroups();
        };

        socket.on('user_online', handleUserOnline);
        socket.on('user_offline', handleUserOffline);
        socket.on('chat-msg', handleNewMessage);
        socket.on('group-msg', handleGroupMessage);
        socket.on('new_user_added', handleNewUser);
        socket.on('group-created', handleGroupCreated);
        socket.on('call:incoming', handleIncomingCall);
        socket.on('call:ended', handleCallEnded);
        socket.on('call:declined', handleCallDeclined);
        socket.on('group-updated', handleGroupUpdated);

        return () => {
            socket.off('user_online', handleUserOnline);
            socket.off('user_offline', handleUserOffline);
            socket.off('chat-msg', handleNewMessage);
            socket.off('group-msg', handleGroupMessage);
            socket.off('new_user_added', handleNewUser);
            socket.off('group-created', handleGroupCreated);
            socket.off('call:incoming', handleIncomingCall);
            socket.off('call:ended', handleCallEnded);
            socket.off('call:declined', handleCallDeclined);
            socket.off('group-updated', handleGroupUpdated);
        };
    }, [socket, callDetails, fetchUsers, fetchGroups]);

    useEffect(() => {
        fetchGroups();
    }, [fetchGroups]);

    const handleMessageSent = useCallback((sentMsgObj) => {
        if (selectedUser?.id === 'ai-bot-user') return;
        if (!selectedUser) return;
        setUsers(prevUsers => {
            const updatedUsers = prevUsers.map(user => 
                user.id === selectedUser.id 
                    ? { 
                        ...user, 
                        lastMessage: sentMsgObj.type === 'image' ? '📷 Photo' : sentMsgObj.content, 
                        lastMessageTimestamp: sentMsgObj.createdAt
                      } 
                    : user
            );
            return updatedUsers.sort((a, b) => {
                if (!a.lastMessageTimestamp) return 1;
                if (!b.lastMessageTimestamp) return -1;
                return new Date(b.lastMessageTimestamp) - new Date(a.lastMessageTimestamp);
            });
        });
    }, [selectedUser]);

    const handleGroupMessageSent = useCallback(({ msg, groupId, from, type }) => {
        setGroups(prevGroups => prevGroups.map(group =>
            group._id === groupId
                ? {
                    ...group,
                    lastMessage: { content: msg, type: type || 'text', sender: from }
                }
                : group
        ));
    }, []);

    const handleUserSelect = (user) => {
        setSelectedUser(user);
        if (isMobile) {
            setShowChat(true);
        }
    };

    const handleBackToList = () => {
        setShowChat(false);
        setSelectedUser(null);
    };

    const handleViewProfile = (user) => {
        const fullUser = users.find(u => u.id === user.id) || user;
        setViewingProfileOf(fullUser);
    };

    const handleCloseProfile = () => {
        setViewingProfileOf(null);
    };

    const handleMessageFromProfile = (user) => {
        setSelectedUser(user);
        setViewingProfileOf(null);
        if (isMobile) {
            setShowChat(true);
        }
    };
    
    const handleStartCall = (userToCall, callType) => {
        if (!userToCall || !socket) return;
        
        setViewingProfileOf(null);

        setCallDetails({
            type: 'outgoing',
            peer: {
                userId: userToCall.id,
                username: userToCall.name,
                picture: userToCall.picture,
            },
            callType: callType
        });
    };

    const handleEndCall = () => {
        if (callDetails && socket) {
            socket.emit('call:end', { toUserId: callDetails.peer.userId });
        }
        setCallDetails(null);
        setIncomingCallDetails(null);
    };

    const handleAcceptCall = () => {
        if (!incomingCallDetails) return;
        setCallDetails({ ...incomingCallDetails });
        setIncomingCallDetails(null);
    };

    const handleDeclineCall = () => {
        if (!incomingCallDetails || !socket) return;
        socket.emit('call:decline', { toUserId: incomingCallDetails.peer.userId });
        setIncomingCallDetails(null);
    };

    const handleLogout = () => {
        if (window.confirm("Are you sure you want to log out?")) {
            disconnectSocket();
            localStorage.removeItem('jwt_token');
            navigate('/');
        }
    };

    const handleOpenCreateGroup = () => setShowCreateGroup(true);
    const handleCloseCreateGroup = () => setShowCreateGroup(false);

    const handleGroupCreated = (group) => {
        setGroups(prev => {
            const groupExists = prev.some(g => g._id === group._id);
            if (groupExists) return prev;
            return [group, ...prev];
        });
        setShowCreateGroup(false);
    };

    const filteredUsers = users.filter(user =>
        user.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (viewingProfileOf) {
        return <Profile 
                   user={viewingProfileOf} 
                   onClose={handleCloseProfile}
                   onMessageClick={handleMessageFromProfile}
                   onStartCall={handleStartCall}
               />;
    }
    
    return (
        <>
            <div className={`flex h-screen bg-gray-100 ${callDetails ? 'hidden' : 'flex'}`}>
                {isMobile ? (
                    <>
                        {(!showChat || !selectedUser) ? (
                            <div className="w-full bg-white flex flex-col h-screen">
                                <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-blue-600 to-purple-600">
                                    <div className="flex justify-between items-center mb-4">
                                        <div className="flex items-center space-x-2">
                                            <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center">
                                                <MessageCircle className="text-blue-600" size={20} />
                                            </div>
                                            <h1 className="text-2xl font-bold text-white">Chitzy</h1>
                                        </div>
                                        <button onClick={handleLogout} className="p-2 text-white hover:text-red-200 hover:bg-white/10 rounded-full transition-colors" aria-label="Logout">
                                            <LogOut size={20} />
                                        </button>
                                    </div>
                                    <div className="flex items-center justify-between mb-4">
                                        <h2 className="text-lg font-medium text-white/90">Your Conversations</h2>
                                        <button onClick={handleOpenCreateGroup} className="bg-white/20 backdrop-blur-sm text-white px-3 py-1.5 rounded-lg hover:bg-white/30 transition-colors text-sm font-medium">
                                            <Users size={16} className="inline mr-1" />
                                            New Group
                                        </button>
                                    </div>
                                    <div className="relative">
                                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                                        <input
                                            type="text"
                                            placeholder="Search chats..."
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            className="w-full pl-10 pr-4 py-2.5 bg-white/90 backdrop-blur-sm border-0 rounded-lg focus:outline-none focus:ring-2 focus:ring-white focus:bg-white placeholder-gray-500"
                                        />
                                    </div>
                                </div>
                                <div className="flex-1 overflow-y-auto">
                                    {groups.length > 0 && (
                                        <>
                                            <div className="px-4 pt-3 pb-1 text-xs text-gray-400 uppercase tracking-wider font-semibold bg-gray-50">
                                                <Users size={12} className="inline mr-1" />
                                                Groups
                                            </div>
                                            {groups.map(group => (
                                                <div key={group._id} onClick={() => { handleUserSelect({
                                                    id: group._id,
                                                    name: group.groupName,
                                                    picture: group.groupPicture || '/vite.svg',
                                                    isGroup: true,
                                                    members: group.participants
                                                }); setShowChat(true); }} className={`p-4 border-b border-gray-100 cursor-pointer hover:bg-blue-50 transition-colors ${selectedUser?.id === group._id ? 'bg-blue-50 border-l-4 border-blue-500' : 'border-l-4 border-transparent'}`}>
                                                    <div className="flex items-center space-x-3">
                                                        <div className="relative">
                                                            <img src={group.groupPicture || '/vite.svg'} alt={group.groupName} className="w-12 h-12 rounded-full object-cover" />
                                                            <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                                                                <Users className="text-white" size={10} />
                                                            </div>
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex justify-between items-baseline">
                                                                <h3 className="font-semibold text-gray-900 truncate">{group.groupName}</h3>
                                                                <span className="text-xs text-blue-500 ml-2 font-medium">Group</span>
                                                            </div>
                                                            <p className="text-sm text-gray-500 truncate mt-1">
                                                                {group.lastMessage?.content
                                                                    ? (group.lastMessage.type === 'image' ? '📷 Photo' : group.lastMessage.content)
                                                                    : 'Start a group chat...'}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </>
                                    )}
                                    <div className="px-4 pt-3 pb-1 text-xs text-gray-400 uppercase tracking-wider font-semibold bg-gray-50">
                                        <MessageCircle size={12} className="inline mr-1" />
                                        Direct Messages
                                    </div>
                                    {filteredUsers.map((user) => (
                                        <div key={user.id} onClick={() => { handleUserSelect(user); setShowChat(true); }} className={`p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors ${selectedUser?.id === user.id ? 'bg-blue-50 border-l-4 border-blue-500' : 'border-l-4 border-transparent'}`}>
                                            <div className="flex items-center space-x-3">
                                                <div className="relative flex-shrink-0" onClick={(e) => { e.stopPropagation(); handleViewProfile(user); }}>
                                                    <img src={user.picture} alt={user.name} referrerPolicy="no-referrer" className="w-12 h-12 rounded-full object-cover" />
                                                    <div className={`absolute bottom-0 right-0 w-3 h-3 ${user.isOnline ? 'bg-green-500' : 'bg-gray-400'} rounded-full border-2 border-white`}></div>
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex justify-between items-baseline">
                                                        <h3 className="font-semibold text-gray-900 truncate">{user.name}</h3>
                                                        {user.lastMessageTimestamp && (<span className="text-xs text-gray-400 ml-2">{new Date(user.lastMessageTimestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>)}
                                                    </div>
                                                    <p className="text-sm text-gray-500 truncate mt-1">{user.lastMessage ? user.lastMessage : `Start a conversation...`}</p>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <div className="w-full h-screen flex flex-col">
                                <Chat 
                                    key={selectedUser?.id}
                                    selectedUser={selectedUser} 
                                    myInfo={myInfo}
                                    onMessageSent={handleMessageSent}
                                    onGroupMessageSent={handleGroupMessageSent}
                                    isMobile={true}
                                    onBack={handleBackToList}
                                    onViewProfile={handleViewProfile}
                                    onStartCall={(callType) => handleStartCall(selectedUser, callType)}
                                    onUpdateSelectedUser={setSelectedUser}
                                />
                            </div>
                        )}
                    </>
                ) : (
                    <>
                        <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
                            <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-blue-600 to-purple-600">
                                <div className="flex justify-between items-center mb-4">
                                    <div className="flex items-center space-x-2">
                                        <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center">
                                            <MessageCircle className="text-blue-600" size={20} />
                                        </div>
                                        <h1 className="text-xl font-bold text-white">Chitzy</h1>
                                    </div>
                                    <button onClick={handleLogout} className="p-2 text-white hover:text-red-200 hover:bg-white/10 rounded-full transition-colors" aria-label="Logout">
                                        <LogOut size={20} />
                                    </button>
                                </div>
                                <div className="flex items-center justify-between mb-4">
                                    <h2 className="text-lg font-medium text-white/90">Conversations</h2>
                                    <button onClick={handleOpenCreateGroup} className="bg-white/20 backdrop-blur-sm text-white px-3 py-1.5 rounded-lg hover:bg-white/30 transition-colors text-sm font-medium">
                                        <Users size={16} className="inline mr-1" />
                                        New Group
                                    </button>
                                </div>
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                                    <input type="text" placeholder="Search chats..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-10 pr-4 py-2.5 bg-white/90 backdrop-blur-sm border-0 rounded-lg focus:outline-none focus:ring-2 focus:ring-white focus:bg-white placeholder-gray-500" />
                                </div>
                            </div>
                            <div className="flex-1 overflow-y-auto">
                                {groups.length > 0 && (
                                    <>
                                        <div className="px-4 pt-3 pb-1 text-xs text-gray-400 uppercase tracking-wider font-semibold bg-gray-50">
                                            <Users size={12} className="inline mr-1" />
                                            Groups
                                        </div>
                                        {groups.map(group => (
                                            <div key={group._id} onClick={() => handleUserSelect({
                                                id: group._id,
                                                name: group.groupName,
                                                picture: group.groupPicture || '/vite.svg',
                                                isGroup: true,
                                                members: group.participants
                                            })} className={`p-4 border-b border-gray-100 cursor-pointer hover:bg-blue-50 transition-colors ${selectedUser?.id === group._id ? 'bg-blue-50 border-l-4 border-blue-500' : 'border-l-4 border-transparent'}`}>
                                                <div className="flex items-center space-x-3">
                                                    <div className="relative">
                                                        <img src={group.groupPicture || '/vite.svg'} alt={group.groupName} className="w-12 h-12 rounded-full object-cover" />
                                                        <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                                                            <Users className="text-white" size={10} />
                                                        </div>
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex justify-between items-baseline">
                                                            <h3 className="font-semibold text-gray-900 truncate">{group.groupName}</h3>
                                                            <span className="text-xs text-blue-500 ml-2 font-medium">Group</span>
                                                        </div>
                                                        <p className="text-sm text-gray-500 truncate mt-1">
                                                            {group.lastMessage?.content
                                                                ? (group.lastMessage.type === 'image' ? '📷 Photo' : group.lastMessage.content)
                                                                : 'Start a group chat...'}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </>
                                )}
                                <div className="px-4 pt-3 pb-1 text-xs text-gray-400 uppercase tracking-wider font-semibold bg-gray-50">
                                    <MessageCircle size={12} className="inline mr-1" />
                                    Direct Messages
                                </div>
                                {filteredUsers.map((user) => (
                                    <div key={user.id} onClick={() => handleUserSelect(user)} className={`p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors ${selectedUser?.id === user.id ? 'bg-blue-50 border-l-4 border-blue-500' : 'border-l-4 border-transparent'}`}>
                                        <div className="flex items-center space-x-3">
                                            <div className="relative flex-shrink-0" onClick={(e) => { e.stopPropagation(); handleViewProfile(user); }}>
                                                <img src={user.picture} alt={user.name} referrerPolicy="no-referrer" className="w-12 h-12 rounded-full object-cover" />
                                                <div className={`absolute bottom-0 right-0 w-3 h-3 ${user.isOnline ? 'bg-green-500' : 'bg-gray-400'} rounded-full border-2 border-white`}></div>
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex justify-between items-baseline">
                                                    <h3 className="font-semibold text-gray-900 truncate">{user.name}</h3>
                                                    {user.lastMessageTimestamp && (<span className="text-xs text-gray-400 ml-2">{new Date(user.lastMessageTimestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>)}
                                                </div>
                                                <p className="text-sm text-gray-500 truncate mt-1">{user.lastMessage ? user.lastMessage : `Start a conversation...`}</p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="flex-1 flex flex-col">
                            {selectedUser ? (
                                <Chat 
                                    key={selectedUser?.id}
                                    selectedUser={selectedUser} 
                                    myInfo={myInfo}
                                    onMessageSent={handleMessageSent}
                                    onGroupMessageSent={handleGroupMessageSent}
                                    isMobile={false}
                                    onViewProfile={handleViewProfile}
                                    onStartCall={(callType) => handleStartCall(selectedUser, callType)}
                                    onUpdateSelectedUser={setSelectedUser}
                                />
                            ) : (
                                <div className="flex-1 flex items-center justify-center bg-gray-50">
                                    <div className="text-center text-gray-500">
                                        <MessageCircle size={64} className="mx-auto mb-4 text-gray-300" />
                                        <h3 className="text-xl font-semibold mb-2">Welcome to Chitzy</h3>
                                        <p>Choose a chat from the left to start messaging.</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </>
                )}
            </div>
            
            <IncomingCallNotification 
                callDetails={incomingCallDetails}
                onAccept={handleAcceptCall}
                onDecline={handleDeclineCall}
            />
            
            {callDetails && (
                <CallModal 
                    callDetails={callDetails}
                    onEndCall={handleEndCall}
                />
            )}

            {showCreateGroup && (
                <CreateGroupModal 
                    users={users.filter(u => u.id !== 'ai-bot-user')}
                    onClose={handleCloseCreateGroup}
                    onGroupCreated={handleGroupCreated}
                />
            )}
        </>
    );
};

export default App;