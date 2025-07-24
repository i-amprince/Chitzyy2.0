import React, { useState } from 'react';
// Import the icons we need for the call buttons
import { X, Mail, Phone, Video } from 'lucide-react';

// We add a new prop: onStartCall
const Profile = ({ user, onClose, onMessageClick, onStartCall }) => {
  if (!user) return null;

  // NEW: State to manage the visibility of the call options
  const [showCallOptions, setShowCallOptions] = useState(false);

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900 bg-opacity-30 backdrop-blur-sm" 
      onClick={onClose}
    >
      <div 
        className="relative bg-white rounded-xl shadow-2xl w-11/12 max-w-sm overflow-hidden animate-fade-in-up border border-gray-100"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative bg-gradient-to-r from-blue-50 to-indigo-50 px-6 pt-8 pb-6">
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 hover:bg-white hover:bg-opacity-70 rounded-full transition-all duration-200"
          >
            <X size={20} />
          </button>
          <div className="flex flex-col items-center">
            <div className="relative">
              <img 
                src={user.picture} 
                alt={user.name}
                referrerPolicy="no-referrer" 
                className="w-24 h-24 rounded-full border-4 border-white shadow-lg object-cover"
              />
              <div className={`absolute bottom-1 right-1 w-6 h-6 rounded-full border-3 border-white ${
                user.isOnline ? 'bg-green-500' : 'bg-gray-400'
              } shadow-sm`}></div>
            </div>
            <h2 className="text-2xl font-semibold text-gray-900 mt-4 mb-1">{user.name}</h2>
            <p className="text-sm text-gray-600 font-medium">
              {user.isOnline ? 'Available' : 'Away'}
            </p>
          </div>
        </div>

        <div className="px-6 py-6">
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Contact Information</h3>
            <div className="flex items-center p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-center w-10 h-10 bg-blue-100 rounded-full mr-3">
                <Mail className="w-5 h-5 text-blue-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900">Email</p>
                <p className="text-sm text-gray-600 truncate">{user.email}</p>
              </div>
            </div>
          </div>

          {/* ======================================================================
                                  THE UPDATED ACTION BUTTONS
             ====================================================================== */}
          <div className="flex space-x-3 mt-6">
            <button 
              onClick={() => onMessageClick(user)}
              className="flex-1 bg-blue-600 text-white py-2.5 px-4 rounded-lg font-medium hover:bg-blue-700 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">
              Message
            </button>
            
            {/* This is now a container for the call button and its dropdown */}
            <div className="relative flex-1">
              <button 
                onClick={() => setShowCallOptions(!showCallOptions)}
                className="w-full bg-gray-100 text-gray-700 py-2.5 px-4 rounded-lg font-medium hover:bg-gray-200 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2">
                Call
              </button>

              {/* Conditionally rendered call options dropdown */}
              {showCallOptions && (
                <div className="absolute bottom-full mb-2 w-full bg-white border border-gray-200 rounded-lg shadow-lg z-10 animate-fade-in-up-sm">
                  <button 
                    onClick={() => onStartCall(user, 'audio')}
                    className="w-full flex items-center justify-center space-x-2 text-left px-4 py-3 hover:bg-gray-50 rounded-t-lg transition-colors"
                  >
                    <Phone size={18} className="text-blue-500" />
                    <span className="font-medium text-gray-700">Audio Call</span>
                  </button>
                  <button 
                    onClick={() => onStartCall(user, 'video')}
                    className="w-full flex items-center justify-center space-x-2 text-left px-4 py-3 hover:bg-gray-50 rounded-b-lg transition-colors"
                  >
                    <Video size={18} className="text-green-500" />
                    <span className="font-medium text-gray-700">Video Call</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
       <style jsx>{`
        .animate-fade-in-up-sm {
          animation: fade-in-up-sm 0.2s ease-out forwards;
        }
        @keyframes fade-in-up-sm {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
};

export default Profile;