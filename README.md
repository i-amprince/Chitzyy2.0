# Chitizyy - Real-Time Full-Stack Chat Application

![React](https://img.shields.io/badge/react-%2320232a.svg?style=for-the-badge&logo=react&logoColor=%2361DAFB)
![Node.js](https://img.shields.io/badge/node.js-6DA55F?style=for-the-badge&logo=node.js&logoColor=white)
![Express.js](https://img.shields.io/badge/express.js-%23404d59.svg?style=for-the-badge&logo=express&logoColor=%2361DAFB)
![MongoDB](https://img.shields.io/badge/MongoDB-%234ea94b.svg?style=for-the-badge&logo=mongodb&logoColor=white)
![Socket.io](https://img.shields.io/badge/Socket.io-black?style=for-the-badge&logo=socket.io&logoColor=white)
![TailwindCSS](https://img.shields.io/badge/tailwindcss-%2338B2AC.svg?style=for-the-badge&logo=tailwind-css&logoColor=white)

Chitizyy is a modern, feature-rich chat application built with the MERN stack (MongoDB, Express, React, Node.js) and powered by Socket.io for real-time communication. It provides a seamless and interactive experience for one-to-one messaging, group chats, media sharing, and video/audio calls.

## ✨ Key Features
- **Real-Time Messaging:** One-to-one and group chats powered by Socket.io.
- **User Authentication:** Secure login and registration flow using Google OAuth.
- **Media Sharing:** Seamlessly send and receive images, uploaded to Cloudinary.
- **Calling Functionality:** Integrated audio and video call interface using WebRTC.
- **Group Management:** Create groups, add members, leave groups, and see participant lists.
- **AI Assistant:** Integrated with Google's Gemini AI for an intelligent chat experience.
- **Emoji Support:** Express yourself with a full emoji picker.
- **User Profiles:** View profiles of other users to see their details.
- **Modern UI:** A clean and responsive user interface built with Vite, React, and Tailwind CSS.

## 📸 Screenshots
<details>
<summary>Click to view application screenshots</summary>

| Login Page | Chat Interface |
|------------|---------------|
| ![Login](src/images/1.png) | ![Chats](src/images/2.png) |

| Profile View | Create Group |
|--------------|-------------|
| ![Profile](src/images/3.png) | ![Create Group](src/images/4.png) |

| Group Chat | Call Interface |
|------------|---------------|
| ![Group Chat](src/images/5.png) | ![Call Interface](src/images/6.png) |

</details>

## 🛠️ Tech Stack
| Area      | Technologies                                                      |
|-----------|-------------------------------------------------------------------|
| Frontend  | React, Vite, Tailwind CSS, Socket.io-client, Axios, React Router  |
| Backend   | Node.js, Express.js, Socket.io, Mongoose, JWT                     |
| Database  | MongoDB (using Mongoose ODM)                                      |
| Services  | Google OAuth, Google Gemini AI, Cloudinary, WebRTC                |

## 🚀 Getting Started
Follow these instructions to get a copy of the project up and running on your local machine for development and testing purposes.

### Prerequisites
- Node.js (v18.x or higher)
- npm or yarn
- A MongoDB Atlas account (or a local MongoDB instance)
- A Cloudinary account
- A Google Cloud Platform project with OAuth and Gemini AI enabled

### 1. Clone the Repository
```bash
git clone https://github.com/your-username/chitizyy.git
cd chitizyy
```

### 2. Install Dependencies
```bash
# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### 3. Environment Configuration
This project requires environment variables to run. Create a `.env` file in both the backend and frontend directories.

#### Backend (`backend/.env`)
Create a `.env` file in the backend folder and add the following variables. **Do not commit this file to Git.**
```env
# MongoDB Connection String from MongoDB Atlas
MONGO_URI=your_mongodb_connection_string_here

# Cloudinary Credentials for image hosting
CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret

# JWT Secret for user authentication tokens
JWT_SECRET=a_very_strong_and_random_secret_key

# Google AI API Key for the AI assistant
GOOGLE_AI_API_KEY=your_google_ai_api_key

# Server Port
PORT=5000

# Frontend URL for enabling CORS
CLIENT_URL=http://localhost:5173
```

#### Frontend (`frontend/.env`)
Create a `.env` file in the frontend folder and add the following variables.
```env
# The base URL of your backend server
VITE_API_URL=http://localhost:5000

# Your Google OAuth Client ID from Google Cloud Platform
VITE_GOOGLE_CLIENT_ID=your_google_oauth_client_id.apps.googleusercontent.com
```

### 4. Run the Application
You need to run two separate commands in two separate terminals to start both the backend and frontend servers.
```bash
# In the first terminal, start the backend server
cd backend
npm start
```
```bash
# In the second terminal, start the frontend development server
cd ../frontend
npm run dev
```
The frontend should now be running at [http://localhost:5173](http://localhost:5173) and connected to your backend at [http://localhost:5000](http://localhost:5000).

## 📁 Folder Structure
```
.
├── backend/         # Node.js/Express backend code
└── frontend/        # React + Vite frontend code
    └── src/
        └── images/  # Screenshots for README
```

## 🤝 Contributing
Pull requests are welcome! For major changes, please open an issue first to discuss what you would like to change. Please make sure to update tests as appropriate.

## 📄 License
This project is licensed under the MIT License - see the LICENSE file for details.
