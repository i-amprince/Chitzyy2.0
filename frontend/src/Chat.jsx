import React, { useState, useEffect, useRef } from 'react';
// Added MessageSquare for the placeholder icon
import { Send, Phone, Video, MoreVertical, Smile, ArrowLeft, Paperclip, Users, ChevronDown, ChevronUp, MessageSquare } from 'lucide-react';
import EmojiPicker, { Theme } from 'emoji-picker-react';
import axios from 'axios';
import { getSocket } from './socket';
import AddUserToGroupModal from './AddUserToGroupModal';

const Chat = ({ selectedUser, myInfo, onMessageSent, onGroupMessageSent, isMobile = false, onBack, onViewProfile, onStartCall, onUpdateSelectedUser }) => {
    const [messages, setMessages] = useState([]);
    const [loading, setLoading] = useState(true); // NEW: State to handle loading view
    const [message, setMessage] = useState('');
    const [showPicker, setShowPicker] = useState(false);
    const [isRecipientOnline, setIsRecipientOnline] = useState(selectedUser.isOnline);
    const [isAiTyping, setIsAiTyping] = useState(false);
    const [showParticipants, setShowParticipants] = useState(false);
    const [participantNames, setParticipantNames] = useState([]);
    const [showAddUserModal, setShowAddUserModal] = useState(false);

    const apiUrl = import.meta.env.VITE_API_URL;
    
    const mySocket = getSocket();
    const chatEndRef = useRef(null);
    const fileInputRef = useRef(null);

    const isAiChat = selectedUser.id === 'ai-bot-user';

    const scrollToBottom = () => {
        chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    // This useEffect is updated to handle the loading state
    useEffect(() => {
        if (isAiChat) {
            setMessages([
                {
                    id: 'ai-welcome-message',
                    text: `Hello, ${myInfo.username}! I'm YourAI, powered by Google Gemini. Ask me anything!`,
                    type: 'text', sender: 'other',
                    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                    avatar: selectedUser.picture,
                }
            ]);
            setLoading(false); // Stop loading for AI chat
            return;
        }

        setIsRecipientOnline(selectedUser.isOnline);
        const fetchMessages = async () => {
            if (!selectedUser) return;
            setLoading(true); // Set loading to true before fetching
            try {
                const token = localStorage.getItem('jwt_token');
                let res;
                if (selectedUser.isGroup) {
                    res = await axios.get(`${apiUrl}/api/messages/group/${selectedUser.id}`, {
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                } else {
                    res = await axios.get(`${apiUrl}/api/messages/${selectedUser.id}`, {
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                }
                const formattedMessages = res.data.map(msg => {
                    if (selectedUser.isGroup) {
                        return {
                            id: msg._id, text: msg.content, type: msg.type,
                            sender: msg.sender._id === myInfo.userId ? 'me' : 'other',
                            timestamp: new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                            avatar: msg.sender.picture || selectedUser.picture,
                            senderName: msg.sender.username
                        };
                    } else {
                        return {
                            id: msg._id, text: msg.content, type: msg.type,
                            sender: msg.sender === myInfo.userId ? 'me' : 'other',
                            timestamp: new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                            avatar: msg.sender === myInfo.userId ? myInfo.picture : selectedUser.picture,
                        };
                    }
                });
                setMessages(formattedMessages);
            } catch (err) {
                console.error("Failed to fetch messages", err);
                setMessages([]);
            } finally {
                setLoading(false); // Set loading to false after fetching is complete
            }
        };
        fetchMessages();
        setShowPicker(false);
    }, [selectedUser, myInfo, isAiChat]);

    // All other useEffect hooks remain unchanged as they work perfectly
    useEffect(() => {
        if (!mySocket || isAiChat) return;
        const handleChatMessage = ({ msg, from, type }) => {
            if (from.id === selectedUser?.id) {
                setMessages(prev => [...prev, { 
                    id: Date.now(), text: msg, type: type, sender: 'other', 
                    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), 
                    avatar: selectedUser.picture 
                }]);
            }
        };
        mySocket.on('chat-msg', handleChatMessage);
        return () => { mySocket.off('chat-msg', handleChatMessage); };
    }, [mySocket, selectedUser, isAiChat]);

    useEffect(() => {
        if (!mySocket || isAiChat) return;
        const handleGroupMessage = ({ msg, groupId, from, type }) => {
            if (groupId === selectedUser?.id) {
                setMessages(prev => [...prev, {
                    id: Date.now(), text: msg, type: type || 'text', sender: 'other',
                    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                    avatar: from.picture || selectedUser.picture
                }]);
            }
        };
        mySocket.on('group-msg', handleGroupMessage);
        return () => { mySocket.off('group-msg', handleGroupMessage); };
    }, [mySocket, selectedUser, isAiChat]);

    useEffect(() => {
        if (!mySocket || isAiChat) return;
        const handleUserOnline = ({ userId }) => { if (userId === selectedUser?.id) setIsRecipientOnline(true); };
        const handleUserOffline = ({ userId }) => { if (userId === selectedUser?.id) setIsRecipientOnline(false); };
        mySocket.on('user_online', handleUserOnline);
        mySocket.on('user_offline', handleUserOffline);
        return () => {
            mySocket.off('user_online', handleUserOnline);
            mySocket.off('user_offline', handleUserOffline);
        };
    }, [mySocket, selectedUser, isAiChat]);
    
    // Updated to scroll whenever messages change, which is more accurate
    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    // All handler functions remain unchanged
    const onEmojiClick = (emojiObject) => {
        setMessage(prevMessage => prevMessage + emojiObject.emoji);
    };

    const handleFileChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const formData = new FormData();
        formData.append('file', file);
        formData.append('toUserId', selectedUser.id);
        try {
            const token = localStorage.getItem('jwt_token');
            const res = await axios.post(`${apiUrl}/api/upload/file`, formData, {
                headers: { 'Content-Type': 'multipart/form-data', 'Authorization': `Bearer ${token}` }
            });
            const newMessage = res.data;
            setMessages(prev => [...prev, { 
                id: newMessage._id, text: newMessage.content, type: newMessage.type, sender: 'me', 
                timestamp: new Date(newMessage.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), 
                avatar: myInfo.picture 
            }]);
            if (onMessageSent) onMessageSent(newMessage);
        } catch (error) {
            console.error("File upload failed:", error);
            alert("Upload failed. Please use a supported image format.");
        } finally {
            if(fileInputRef.current) fileInputRef.current.value = "";
        }
    };

    const handleSendMessageToAI = async () => {
        if (message.trim() === '') return;
        const currentMessage = message;
        const userMessage = {
            id: Date.now(), text: currentMessage, sender: 'me', type: 'text',
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            avatar: myInfo.picture
        };
        setMessages(prev => [...prev, userMessage]);
        setMessage('');
        setIsAiTyping(true);
        try {
            const token = localStorage.getItem('jwt_token');
            const chatHistoryForAPI = messages.filter(msg => msg.id !== 'ai-welcome-message');
            const res = await axios.post(`${apiUrl}/api/ai/chat`, 
                { prompt: currentMessage, history: chatHistoryForAPI },
                { headers: { 'Authorization': `Bearer ${token}` } }
            );
            const aiMessage = {
                id: Date.now() + 1, text: res.data.reply, sender: 'other', type: 'text',
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                avatar: selectedUser.picture
            };
            setMessages(prev => [...prev, aiMessage]);
        } catch (error) {
            const errorMessage = {
                id: Date.now() + 1, text: "Sorry, I'm having trouble connecting right now.", sender: 'other', type: 'text',
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                avatar: selectedUser.picture
            };
            setMessages(prev => [...prev, errorMessage]);
            console.error("AI chat error:", error);
        } finally {
            setIsAiTyping(false);
        }
    };

    const handleSendMessage = () => {
        if (isAiChat) {
            handleSendMessageToAI();
        } else if (selectedUser.isGroup) {
            if (message.trim() && mySocket) {
                mySocket.emit('group-msg', { msg: message, groupId: selectedUser.id });
                if (onGroupMessageSent) onGroupMessageSent({
                    msg: message,
                    groupId: selectedUser.id,
                    from: { id: myInfo.userId, name: myInfo.username, picture: myInfo.picture },
                    type: 'text'
                });
                const tempId = Date.now();
                setMessages(prev => [...prev, {
                    id: tempId, text: message, sender: 'me', type: 'text',
                    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                    avatar: myInfo.picture
                }]);
                if (onMessageSent) onMessageSent({ content: message, type: 'text', createdAt: new Date().toISOString() });
                setMessage('');
                setShowPicker(false);
            }
        } else {
            if (message.trim() && mySocket) {
                mySocket.emit('chat-msg', { msg: message, toUserId: selectedUser.id });
                const tempId = Date.now();
                setMessages(prev => [...prev, {
                    id: tempId, text: message, sender: 'me', type: 'text',
                    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                    avatar: myInfo.picture
                }]);
                if (onMessageSent) onMessageSent({ content: message, type: 'text', createdAt: new Date().toISOString() });
                setMessage('');
                setShowPicker(false);
            }
        }
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    };

    const handleLeaveGroup = async () => {
        if (!selectedUser.isGroup || !window.confirm('Are you sure you want to leave this group?')) return;
        try {
            const token = localStorage.getItem('jwt_token');
            await axios.post(`${apiUrl}/api/groups/leave`, {
                groupId: selectedUser.id
            }, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (onBack) onBack();
        } catch (err) {
            alert('Failed to leave group.');
        }
    };

    useEffect(() => {
        const fetchNames = async () => {
            if (selectedUser.isGroup && showParticipants && selectedUser.members?.length) {
                try {
                    const token = localStorage.getItem('jwt_token');
                    const res = await axios.post(`${apiUrl}/api/groups/participants`, {
                        memberIds: selectedUser.members
                    }, {
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    setParticipantNames(res.data);
                } catch {
                    setParticipantNames([]);
                }
            }
        };
        fetchNames();
    }, [showParticipants, selectedUser]);

    React.useEffect(() => {
        if (!mySocket || !selectedUser?.isGroup) return;
        mySocket.emit('request-group-info', { groupId: selectedUser.id });
        const handleGroupUpdated = ({ groupId }) => {
            if (groupId === selectedUser.id) {
                mySocket.emit('request-group-info', { groupId });
            }
        };
        const handleGroupInfo = ({ groupId, members }) => {
            if (groupId === selectedUser.id) {
                onUpdateSelectedUser(currentSelectedUser => {
                    if (currentSelectedUser && JSON.stringify(currentSelectedUser.members) === JSON.stringify(members)) {
                        return currentSelectedUser;
                    }
                    return { ...currentSelectedUser, members };
                });
            }
        };
        mySocket.on('group-updated', handleGroupUpdated);
        mySocket.on('group-info', handleGroupInfo);
        return () => {
            mySocket.off('group-updated', handleGroupUpdated);
            mySocket.off('group-info', handleGroupInfo);
        };
    }, [mySocket, selectedUser, onUpdateSelectedUser]);


    // The entire return statement (JSX) is updated below
    return (
        <div className="flex-1 flex flex-col h-full bg-white">
            {/* Header: Unchanged and works perfectly */}
            <div className={`flex items-center justify-between border-b border-gray-200 bg-gradient-to-r from-blue-600 to-purple-600 ${isMobile ? 'px-4 py-3' : 'px-6 py-4'}`}>
                <div 
                    className={`flex items-center space-x-3 ${!isAiChat && 'cursor-pointer hover:bg-white/10 rounded-lg p-2 -m-2 transition-colors'}`}
                    onClick={() => !isAiChat && onViewProfile(selectedUser)}
                >
                    {isMobile && onBack && (
                        <button onClick={(e) => { e.stopPropagation(); onBack(); }} className="p-2 text-white hover:text-gray-200 hover:bg-white/10 rounded-full transition-colors mr-2">
                            <ArrowLeft size={20} />
                        </button>
                    )}
                    <div className="relative">
                        <img src={selectedUser.picture} alt={selectedUser.name} referrerPolicy="no-referrer" className={`rounded-full object-cover ${isMobile ? 'w-10 h-10' : 'w-12 h-12'}`} />
                        {selectedUser.isGroup && (
                            <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-white rounded-full flex items-center justify-center">
                                <Users className="text-blue-600" size={12} />
                            </div>
                        )}
                    </div>
                    <div>
                        <h3 className={`font-semibold text-white ${isMobile ? 'text-base' : 'text-lg'}`}>{selectedUser.name}</h3>
                        {selectedUser.isGroup ? (
                            <div className="flex items-center space-x-2">
                                <p className="text-sm text-white/80">
                                    {selectedUser.members?.length > 0 ? `${selectedUser.members.length} members` : 'Group chat'}
                                </p>
                                <button 
                                    onClick={(e) => { e.stopPropagation(); setShowParticipants(!showParticipants); }} 
                                    className="text-white/80 hover:text-white transition-colors flex items-center space-x-1"
                                >
                                    {showParticipants ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                    <span className="text-xs">Members</span>
                                </button>
                            </div>
                        ) : (
                            !isAiChat && <p className={`text-sm ${isRecipientOnline ? 'text-green-200' : 'text-white/60'}`}>{isRecipientOnline ? 'Online' : 'Offline'}</p>
                        )}
                    </div>
                </div>
                <div className="flex items-center space-x-2">
                    {selectedUser.isGroup && (
                        <button 
                            onClick={() => setShowAddUserModal(true)} 
                            className={`bg-white/20 backdrop-blur-sm text-white px-3 py-1.5 rounded-lg hover:bg-white/30 transition-colors text-sm font-medium flex items-center space-x-1 ${isMobile ? 'px-2 py-1 text-xs' : ''}`}
                        >
                            <Users size={14} />
                            <span>Add</span>
                        </button>
                    )}
                    {selectedUser.isGroup ? (
                        <button 
                            onClick={handleLeaveGroup} 
                            className={`bg-red-500/20 backdrop-blur-sm text-white px-3 py-1.5 rounded-lg hover:bg-red-500/30 transition-colors text-sm font-medium ${isMobile ? 'px-2 py-1 text-xs' : ''}`}
                        >
                            Leave
                        </button>
                    ) : !isAiChat && (
                        <>
                            <button onClick={() => onStartCall('audio')} className={`text-white hover:text-gray-200 hover:bg-white/10 rounded-full transition-colors ${isMobile ? 'p-1.5' : 'p-2'}`}><Phone size={isMobile ? 18 : 20} /></button>
                            <button onClick={() => onStartCall('video')} className={`text-white hover:text-gray-200 hover:bg-white/10 rounded-full transition-colors ${isMobile ? 'p-1.5' : 'p-2'}`}><Video size={isMobile ? 18 : 20} /></button>
                            <button className={`text-white hover:text-gray-200 hover:bg-white/10 rounded-full transition-colors ${isMobile ? 'p-1.5' : 'p-2'}`}>
                                <MoreVertical size={isMobile ? 18 : 20} />
                            </button>
                        </>
                    )}
                </div>
            </div>
            
            {/* Participants Panel: Unchanged */}
            {showParticipants && selectedUser.isGroup && (
                <div className="bg-blue-50 border-b border-blue-100">
                    <div className={`${isMobile ? 'px-4 py-3' : 'px-6 py-4'}`}>
                        <div className="flex items-center space-x-2 mb-3">
                            <Users className="text-blue-600" size={16} />
                            <h4 className="font-semibold text-blue-900">Group Members</h4>
                            <span className="bg-blue-600 text-white text-xs px-2 py-0.5 rounded-full">
                                {participantNames.length || selectedUser.members?.length || 0}
                            </span>
                        </div>
                        {participantNames.length > 0 ? (
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                                {participantNames.map((name, index) => (
                                    <div key={index} className="bg-white rounded-lg px-3 py-2 shadow-sm border border-blue-100">
                                        <span className="text-sm text-gray-700 font-medium">{name}</span>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="flex items-center justify-center py-4">
                                <div className="animate-pulse flex items-center space-x-2">
                                    <div className="h-2 w-2 bg-blue-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                                    <div className="h-2 w-2 bg-blue-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                                    <div className="h-2 w-2 bg-blue-400 rounded-full animate-bounce"></div>
                                    <span className="text-blue-600 text-sm ml-2">Loading members...</span>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Messages Area: THIS IS THE UPDATED SECTION */}
            <div className={`flex-1 overflow-y-auto bg-gray-50 ${isMobile ? 'p-4' : 'p-6'}`}>
                {loading ? (
                    <div className="flex flex-col items-center justify-center h-full text-gray-500">
                        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                        <p>Loading conversation...</p>
                    </div>
                ) : messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-gray-400">
                        <MessageSquare size={64} className="mb-4" />
                        <h3 className="text-xl font-semibold text-gray-600">No messages yet</h3>
                        <p className="text-sm">
                            {selectedUser.isGroup ? "Be the first to say something!" : `Start the conversation with ${selectedUser.name}.`}
                        </p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {messages.map((msg) => (
                            <div key={msg.id} className={`flex ${msg.sender === 'me' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`flex items-end space-x-2 ${isMobile ? 'max-w-[85%]' : 'max-w-xs lg:max-w-md'} ${msg.sender === 'me' ? 'flex-row-reverse space-x-reverse' : ''}`}>
                                    <img src={msg.avatar} alt="Avatar" referrerPolicy="no-referrer" className={`rounded-full object-cover flex-shrink-0 ${isMobile ? 'w-6 h-6' : 'w-8 h-8'}`} />
                                    <div className="flex flex-col">
                                        {selectedUser.isGroup && msg.sender !== 'me' && msg.senderName && (
                                            <span className="text-xs text-gray-500 font-medium ml-1 mb-0.5">{msg.senderName}</span>
                                        )}
                                        {msg.type === 'image' ? (
                                            <div className={`rounded-2xl ${msg.sender === 'me' ? 'bg-blue-500' : 'bg-white'}`}>
                                                <img src={msg.text} alt="Sent content" className="max-w-[200px] md:max-w-xs rounded-lg cursor-pointer p-1 border border-transparent" onClick={() => window.open(msg.text, '_blank')} />
                                                <p className={`text-xs mt-1 text-right w-full px-2 pb-1 ${msg.sender === 'me' ? 'text-blue-100' : 'text-gray-500'}`}>{msg.timestamp}</p>
                                            </div>
                                        ) : (
                                            <div className={`px-3 py-2 rounded-2xl ${msg.sender === 'me' ? 'bg-blue-500 text-white rounded-br-sm' : 'bg-white text-gray-900 border border-gray-200 rounded-bl-sm'} ${isMobile ? 'px-3 py-2' : 'px-4 py-2'}`}>
                                                <p className={`break-words ${isMobile ? 'text-sm' : 'text-sm'}`}>{msg.text}</p>
                                                <p className={`text-xs mt-1 text-right w-full ${msg.sender === 'me' ? 'text-blue-100' : 'text-gray-500'}`}>{msg.timestamp}</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
                
                {isAiTyping && (
                    <div className="flex justify-start pt-4">
                        <div className={`flex items-end space-x-2 ${isMobile ? 'max-w-[85%]' : 'max-w-xs lg:max-w-md'}`}>
                            <img src={selectedUser.picture} alt="Avatar" referrerPolicy="no-referrer" className={`rounded-full object-cover flex-shrink-0 ${isMobile ? 'w-6 h-6' : 'w-8 h-8'}`} />
                            <div className={`px-4 py-2 rounded-2xl bg-white text-gray-900 border border-gray-200 rounded-bl-sm`}>
                                <div className="flex items-center space-x-1">
                                    <span className="h-2 w-2 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                                    <span className="h-2 w-2 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                                    <span className="h-2 w-2 bg-gray-400 rounded-full animate-bounce"></span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
                <div ref={chatEndRef} />
            </div>

            {/* Message Input Area: Unchanged */}
            <div className={`border-t border-gray-200 bg-white relative ${isMobile ? 'px-3 py-3' : 'px-6 py-4'}`}>
                <div className="flex items-center space-x-2">
                    <div className="relative">
                        <button onClick={() => setShowPicker(val => !val)} className={`text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full ${isMobile ? 'p-1.5' : 'p-2'}`}><Smile size={isMobile ? 20 : 24} /></button>
                        {showPicker && (<div className={`absolute bottom-full mb-2 z-10 ${isMobile ? 'left-0' : 'left-0'}`}><EmojiPicker onEmojiClick={onEmojiClick} theme={Theme.AUTO} height={isMobile ? 300 : 350} width={isMobile ? 280 : 300} /></div>)}
                    </div>
                    
                    {!isAiChat && (
                        <button onClick={() => fileInputRef.current.click()} className={`text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full ${isMobile ? 'p-1.5' : 'p-2'}`}>
                            <Paperclip size={isMobile ? 20 : 24} />
                        </button>
                    )}
                    <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/png, image/jpeg, image/gif"/>
                    
                    <div className="flex-1">
                        <textarea value={message} onChange={(e) => setMessage(e.target.value)} onKeyPress={handleKeyPress} placeholder="Type a message..." rows={1} 
                            className={`w-full border border-gray-300 rounded-full resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 ${isMobile ? 'px-3 py-2 text-sm' : 'px-4 py-2'}`}
                            style={{minHeight: isMobile ? '36px' : '40px', maxHeight: isMobile ? '100px' : '120px'}}
                        />
                    </div>
                    
                    <button onClick={handleSendMessage} disabled={!message.trim()} className={`bg-blue-500 text-white rounded-full hover:bg-blue-600 disabled:bg-gray-300 transition-colors ${isMobile ? 'p-2' : 'p-3'}`}><Send size={isMobile ? 16 : 18} /></button>
                </div>
            </div>

            {/* Modals: Unchanged */}
            {showAddUserModal && (
                <AddUserToGroupModal 
                    groupId={selectedUser.id}
                    onClose={() => setShowAddUserModal(false)}
                    onUserAdded={() => {
                        setShowAddUserModal(false);
                    }}
                />
            )}
        </div>
    );
};

export default Chat;