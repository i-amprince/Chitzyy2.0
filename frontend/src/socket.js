// src/socket.js (REPLACE your existing file with this)

import { io } from 'socket.io-client';

let socket;
const SERVER_URL = import.meta.env.VITE_API_URL;

// Function to initialize the socket connection
export const initSocket = (token) => {
  // Prevent creating a new socket if one already exists
  if (socket) return;

  // Create the socket instance ONLY when we have the token
  // autoConnect is true by default, which is what we want here.
  socket = io(SERVER_URL, {
    auth: {
      token, // Pass the actual token here
    },
  });

};

// Function to get the existing socket instance
export const getSocket = () => {
  if (!socket) {
    // This can happen if a component tries to access the socket before login
    console.warn('Socket not initialized. Please log in.');
    return null;
  }
  return socket;
};

// Function to disconnect and clean up
export const disconnectSocket = () => {
  if (socket) {
    socket.emit('disconnectt');      
    socket.disconnect();
    socket = null; // Allow for a new socket to be created on next login
  }
};