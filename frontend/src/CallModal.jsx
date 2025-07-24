import React, { useEffect, useRef, useState } from 'react';
import { PhoneOff, Mic, MicOff, Video, VideoOff } from 'lucide-react';
import { getSocket } from './socket';

const stunServers = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
};

const CallModal = ({ callDetails, onEndCall }) => {
    const socket = getSocket();
    const [localStream, setLocalStream] = useState(null);
    const [remoteStream, setRemoteStream] = useState(null);
    const peerConnection = useRef(null);
    const localVideoRef = useRef(null);
    const remoteVideoRef = useRef(null);
    
    const [isMuted, setIsMuted] = useState(false);
    // ======================================================================
    //   CHANGE 1 (BUG FIX): Initialize this state based on the call type.
    // ======================================================================
    const [isVideoOff, setIsVideoOff] = useState(callDetails.callType === 'audio');

    // This primary useEffect handles setting up and tearing down the entire call.
    useEffect(() => {
        const setupCall = async () => {
            try {
                // Get user's camera and microphone stream. We always request video
                // to have a consistent stream object, then disable it if needed.
                const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });

                // ======================================================================
                //   CHANGE 2 (BUG FIX): If it's an audio call, explicitly disable the video track.
                //   This is the key step that stops your camera from showing locally.
                // ======================================================================
                if (callDetails.callType === 'audio') {
                    stream.getVideoTracks().forEach(track => {
                        track.enabled = false;
                    });
                }
                
                setLocalStream(stream);
                if (localVideoRef.current) localVideoRef.current.srcObject = stream;

                // The rest of the setup logic is unchanged from your working version.
                peerConnection.current = new RTCPeerConnection(stunServers);
                stream.getTracks().forEach(track => {
                    peerConnection.current.addTrack(track, stream);
                });
                peerConnection.current.ontrack = (event) => {
                    setRemoteStream(event.streams[0]);
                };
                peerConnection.current.onicecandidate = (event) => {
                    if (event.candidate) {
                        socket.emit('call:ice-candidate', {
                            candidate: event.candidate,
                            toUserId: callDetails.peer.userId,
                        });
                    }
                };
                if (callDetails.type === 'outgoing') {
                    const offer = await peerConnection.current.createOffer();
                    await peerConnection.current.setLocalDescription(offer);
                    // ======================================================================
                    //   CHANGE 3 (BUG FIX): Send the callType to the other user.
                    // ======================================================================
                    socket.emit('call:offer', { offer, toUserId: callDetails.peer.userId, callType: callDetails.callType });
                } else if (callDetails.type === 'incoming' && callDetails.offer) {
                    await peerConnection.current.setRemoteDescription(new RTCSessionDescription(callDetails.offer));
                    const answer = await peerConnection.current.createAnswer();
                    await peerConnection.current.setLocalDescription(answer);
                    socket.emit('call:answer', { answer, toUserId: callDetails.peer.userId });
                }
            } catch (error) {
                console.error('Error setting up call:', error);
                alert('Could not access camera/microphone. Please check permissions and try again.');
                onEndCall();
            }
        };

        setupCall();
        
        const handleAnswer = ({ answer }) => {
            peerConnection.current?.setRemoteDescription(new RTCSessionDescription(answer));
        };
        const handleIceCandidate = ({ candidate }) => {
            peerConnection.current?.addIceCandidate(new RTCIceCandidate(candidate));
        };
        socket.on('call:accepted', handleAnswer);
        socket.on('call:ice-candidate', handleIceCandidate);

        return () => {
            if (peerConnection.current) {
                peerConnection.current.close();
                peerConnection.current = null;
            }
            if (localStream) {
                localStream.getTracks().forEach(track => track.stop());
            }
            socket.off('call:accepted', handleAnswer);
            socket.off('call:ice-candidate', handleIceCandidate);
        };
    }, []);

    // Dedicated useEffect to safely attach the remote stream to the video element.
    useEffect(() => {
        if (remoteStream && remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = remoteStream;
        }
    }, [remoteStream]);


    // UI Control Functions (Unchanged)
    const toggleMute = () => {
        if (localStream) {
            localStream.getAudioTracks().forEach(track => track.enabled = !track.enabled);
            setIsMuted(!isMuted);
        }
    };
    
    const toggleVideo = () => {
        if (localStream && callDetails.callType === 'video') {
            localStream.getVideoTracks().forEach(track => track.enabled = !track.enabled);
            setIsVideoOff(!isVideoOff);
        }
    };

    // JSX Return with light theme design
    return (
        <div className="fixed inset-0 bg-white bg-opacity-95 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-white border border-gray-200 rounded-2xl p-4 sm:p-6 w-full max-w-6xl h-[90vh] sm:h-[85vh] flex flex-col relative shadow-2xl">
                
                <div className="flex-1 w-full h-full relative overflow-hidden rounded-xl bg-gray-50 border border-gray-200">
                    <video ref={remoteVideoRef} autoPlay playsInline className={`w-full h-full object-cover ${callDetails.callType === 'audio' ? 'hidden' : 'block'}`} />
                    
                    {(callDetails.callType === 'audio' || !remoteStream) && (
                        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-indigo-100 flex flex-col items-center justify-center text-gray-700">
                            <div className="relative mb-6">
                                <img 
                                    src={callDetails.peer.picture} 
                                    alt={callDetails.peer.username} 
                                    referrerPolicy="no-referrer" 
                                    className="w-24 h-24 sm:w-32 sm:h-32 rounded-full border-4 border-white shadow-lg" 
                                />
                                <div className="absolute -bottom-1 -right-1 w-6 h-6 sm:w-8 sm:h-8 bg-green-500 border-3 border-white rounded-full"></div>
                            </div>
                            <p className="text-xl sm:text-2xl font-semibold text-gray-800 mb-2">{callDetails.peer.username}</p>
                            <div className="flex items-center">
                                <div className="w-2 h-2 bg-blue-500 rounded-full mr-2 animate-pulse"></div>
                                <p className="text-sm sm:text-base text-gray-600">
                                    {callDetails.type === 'outgoing' && !remoteStream ? 'Calling...' : 'In Call'}
                                </p>
                            </div>
                        </div>
                    )}

                    <div className={`absolute top-3 right-3 sm:top-4 sm:right-4 w-28 h-20 sm:w-48 sm:h-36 rounded-lg overflow-hidden border-3 border-white shadow-lg transition-all ${isVideoOff ? 'bg-gray-100' : 'bg-transparent'}`}>
                        <video ref={localVideoRef} autoPlay playsInline muted className={`w-full h-full object-cover ${isVideoOff ? 'hidden' : 'block'}`} />
                        {isVideoOff && (
                            <div className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                                <VideoOff size={16} className="text-gray-400" />
                            </div>
                        )}
                    </div>

                    <div className="absolute top-3 left-3 sm:top-4 sm:left-4 bg-white bg-opacity-90 backdrop-blur-sm px-3 py-1.5 sm:px-4 sm:py-2 rounded-full border border-gray-200 shadow-sm">
                        <p className="text-sm sm:text-base font-medium text-gray-800">{callDetails.peer.username}</p>
                    </div>
                </div>
                
                <div className="flex justify-center items-center space-x-4 sm:space-x-6 mt-4 sm:mt-6 px-4">
                    <button 
                        onClick={toggleMute} 
                        className={`p-3 sm:p-4 rounded-full transition-all duration-200 shadow-md hover:shadow-lg ${
                            isMuted 
                                ? 'bg-red-50 border-2 border-red-200 text-red-600 hover:bg-red-100' 
                                : 'bg-gray-50 border-2 border-gray-200 text-gray-600 hover:bg-gray-100'
                        }`}
                    >
                        {isMuted ? <MicOff size={20} /> : <Mic size={20} />}
                    </button>
                    
                    <button 
                        onClick={toggleVideo} 
                        disabled={callDetails.callType === 'audio'} 
                        className={`p-3 sm:p-4 rounded-full transition-all duration-200 shadow-md hover:shadow-lg disabled:opacity-40 disabled:cursor-not-allowed ${
                            isVideoOff 
                                ? 'bg-red-50 border-2 border-red-200 text-red-600 hover:bg-red-100' 
                                : 'bg-gray-50 border-2 border-gray-200 text-gray-600 hover:bg-gray-100'
                        }`}
                    >
                        {isVideoOff ? <VideoOff size={20} /> : <Video size={20} />}
                    </button>
                    
                    <button 
                        onClick={onEndCall} 
                        className="p-3 sm:p-4 bg-red-500 border-2 border-red-400 text-white rounded-full hover:bg-red-600 hover:border-red-500 transition-all duration-200 shadow-md hover:shadow-lg"
                    >
                        <PhoneOff size={20} />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CallModal;