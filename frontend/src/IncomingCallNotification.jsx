import React, { useEffect } from 'react';
import { Phone, PhoneOff } from 'lucide-react';

const IncomingCallNotification = ({ callDetails, onAccept, onDecline }) => {
  // Optional: Play a ringing sound when the component mounts
  useEffect(() => {
    // You can find a free ringing sound online and place it in your `public` folder
    const audio = new Audio('/ringing.mp3');
    
    audio.loop = true;
    audio.play().catch(e => console.error("Could not play ringing sound:", e));
    
    // Cleanup function to stop the sound when the component unmounts
    return () => {
      audio.pause();
      audio.currentTime = 0;
    };
  }, []);
  
  if (!callDetails) return null;
  
  return (
    // The main container is fixed to the top of the screen
    <div className="fixed top-6 left-1/2 -translate-x-1/2 w-[90%] sm:w-auto z-50">
      <div className="bg-white border border-gray-200 shadow-xl rounded-2xl p-6 flex flex-col sm:flex-row items-center justify-center sm:justify-start space-y-4 sm:space-y-0 sm:space-x-6 backdrop-blur-sm">
        
        {/* Subtle animated indicator */}
        <div className="absolute -top-1 -left-1 w-4 h-4 bg-blue-500 rounded-full animate-ping"></div>
        <div className="absolute -top-1 -left-1 w-4 h-4 bg-blue-500 rounded-full"></div>
        
        {/* User Info Section */}
        <div className="flex items-center space-x-4">
          <div className="relative">
            <img 
              src={callDetails.peer.picture}
              alt={callDetails.peer.username}
              referrerPolicy="no-referrer"
              className="w-14 h-14 rounded-full border-3 border-gray-100 shadow-md"
            />
            {/* Online indicator */}
            <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-green-500 border-2 border-white rounded-full"></div>
          </div>
          <div>
            <p className="font-semibold text-lg text-gray-900">{callDetails.peer.username}</p>
            <p className="text-sm text-gray-500 flex items-center">
              <span className="w-2 h-2 bg-blue-500 rounded-full mr-2 animate-pulse"></span>
              Incoming Call...
            </p>
          </div>
        </div>
        
        {/* Action Buttons Section */}
        <div className="flex space-x-4">
          <button 
            onClick={onDecline}
            className="p-4 bg-red-50 border border-red-200 text-red-600 rounded-full hover:bg-red-100 hover:border-red-300 transition-all duration-200 shadow-sm hover:shadow-md"
            aria-label="Decline call"
          >
            <PhoneOff size={22} />
          </button>
          <button 
            onClick={onAccept}
            className="p-4 bg-green-50 border border-green-200 text-green-600 rounded-full hover:bg-green-100 hover:border-green-300 transition-all duration-200 shadow-sm hover:shadow-md"
            aria-label="Accept call"
          >
            <Phone size={22} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default IncomingCallNotification;