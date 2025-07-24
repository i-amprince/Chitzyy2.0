// src/components/Login.jsx (REDESIGNED - PROFESSIONAL LOOK)
import React, { useEffect } from 'react';
import { GoogleLogin } from '@react-oauth/google';
import { jwtDecode } from 'jwt-decode';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { MessageCircle, Users, Zap, Shield, Star, CheckCircle } from 'lucide-react';

const Login = () => {
  const navigate = useNavigate();

  const apiUrl = import.meta.env.VITE_API_URL

  const handleSuccess = async (response) => {
    try {
      const decodedUser = jwtDecode(response.credential);

      const res = await axios.post(`${apiUrl}/api/auth/google`, {
        email: decodedUser.email,
        username: decodedUser.name,
        picture: decodedUser.picture,
      });

      const jwt_token = res.data.token;
      localStorage.setItem('jwt_token', jwt_token);

      navigate('/chat');
    } catch (error) {
      console.error('Login failed:', error);
    }
  };

  const handleError = (error) => {
    console.error('Google login error:', error);
  };

  useEffect(() => {
    const token = localStorage.getItem('jwt_token');
    if (token) {
      navigate('/chat');
    }
  }, [navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900 relative overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0">
        <div className="absolute top-20 left-20 w-72 h-72 bg-blue-500/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 right-20 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl animate-pulse delay-2000"></div>
      </div>

      {/* Floating particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(15)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-white/30 rounded-full animate-bounce"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 5}s`,
              animationDuration: `${3 + Math.random() * 4}s`
            }}
          />
        ))}
      </div>

      <div className="relative z-10 flex min-h-screen">
        {/* Left Panel - Features & Branding */}
        <div className="hidden lg:flex lg:flex-1 flex-col justify-center px-12 text-white">
          {/* Brand Header */}
          <div className="mb-12">
            <div className="flex items-center space-x-4 mb-6">
              <div className="w-14 h-14 bg-gradient-to-r from-blue-400 to-purple-400 rounded-2xl flex items-center justify-center shadow-lg">
                <MessageCircle className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                  Chitzy
                </h1>
                <p className="text-blue-200 text-sm">Connect • Collaborate • Create</p>
              </div>
            </div>
            <p className="text-xl text-blue-100 leading-relaxed max-w-lg">
              Experience seamless communication with AI-powered conversations, 
              real-time messaging, and secure group chats.
            </p>
          </div>

          {/* Feature Cards */}
          <div className="space-y-4 mb-12">
            {[
              { icon: MessageCircle, title: "Real-time Messaging", desc: "Instant communication with lightning speed" },
              { icon: Users, title: "Group Conversations", desc: "Create and manage team discussions" },
              { icon: Zap, title: "AI Assistant", desc: "Powered by Google Gemini technology" },
              { icon: Shield, title: "Secure & Private", desc: "Your conversations are protected" }
            ].map((feature, index) => (
              <div key={index} className="flex items-center space-x-4 p-4 bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 hover:bg-white/10 transition-all duration-300">
                <div className="w-10 h-10 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-lg flex items-center justify-center">
                  <feature.icon className="w-5 h-5 text-blue-300" />
                </div>
                <div>
                  <h3 className="font-semibold text-white">{feature.title}</h3>
                  <p className="text-blue-200 text-sm">{feature.desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Social Proof */}
          <div className="flex items-center space-x-6 text-blue-200">
            <div className="flex items-center space-x-1">
              <Star className="w-5 h-5 text-yellow-400 fill-current" />
              <span className="font-semibold">4.9/5</span>
            </div>
            <div className="flex items-center space-x-1">
              <Users className="w-5 h-5" />
              <span>10K+ Users</span>
            </div>
            <div className="flex items-center space-x-1">
              <CheckCircle className="w-5 h-5 text-green-400" />
              <span>Trusted Platform</span>
            </div>
          </div>
        </div>

        {/* Right Panel - Login Form */}
        <div className="flex-1 lg:max-w-md xl:max-w-lg flex items-center justify-center px-8">
          <div className="w-full max-w-md">
            {/* Mobile Brand Header */}
            <div className="lg:hidden text-center mb-12">
              <div className="flex items-center justify-center space-x-3 mb-4">
                <div className="w-12 h-12 bg-gradient-to-r from-blue-400 to-purple-400 rounded-xl flex items-center justify-center">
                  <MessageCircle className="w-7 h-7 text-white" />
                </div>
                <h1 className="text-3xl font-bold text-white">Chitzy</h1>
              </div>
              <p className="text-blue-200">Connect with the world</p>
            </div>

            {/* Login Card */}
            <div className="bg-white/10 backdrop-blur-lg rounded-3xl p-8 border border-white/20 shadow-2xl">
              <div className="text-center mb-8">
                <h2 className="text-3xl font-bold text-white mb-2">Welcome Back</h2>
                <p className="text-blue-200">Sign in to continue your conversations</p>
              </div>

              {/* Login Form */}
              <div className="space-y-6">
                {/* Google Login Button Container */}
                <div className="flex flex-col items-center space-y-4">
                  <div className="w-full flex justify-center">
                    <div className="bg-white rounded-2xl p-1 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105">
                      <GoogleLogin 
                        onSuccess={handleSuccess} 
                        onError={handleError}
                        theme="outline"
                        size="large"
                        width="280"
                      />
                    </div>
                  </div>
                  
                  <p className="text-blue-200 text-sm text-center">
                    By signing in, you agree to our Terms of Service and Privacy Policy
                  </p>
                </div>

                {/* Divider */}
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-white/20"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-4 bg-transparent text-blue-200">Secure login with Google</span>
                  </div>
                </div>

                {/* Features Preview */}
                <div className="grid grid-cols-2 gap-4 pt-4">
                  <div className="text-center p-3 bg-white/5 rounded-xl border border-white/10">
                    <MessageCircle className="w-6 h-6 text-blue-300 mx-auto mb-2" />
                    <p className="text-white text-sm font-medium">Instant Chat</p>
                  </div>
                  <div className="text-center p-3 bg-white/5 rounded-xl border border-white/10">
                    <Zap className="w-6 h-6 text-purple-300 mx-auto mb-2" />
                    <p className="text-white text-sm font-medium">AI Powered</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="text-center mt-8 text-blue-200 text-sm">
              <p>New to Chitzy? Get started in seconds with Google</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;