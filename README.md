# 🍃 MongoDB Web Manager

An open-source, web-based MongoDB management system that provides the features you'd normally pay for in other solutions. Built with Node.js and vanilla JavaScript for simplicity and speed.

## ✨ Features

### Current (MVP)
- 🔌 **Easy Connection Management** - Connect to any MongoDB instance
- 📊 **Database & Collection Browser** - Navigate your data structure intuitively  
- 📄 **Document Viewer** - View documents with syntax highlighting and pagination
- 🔍 **Query Interface** - Execute find(), findOne(), and count() operations
- 📱 **Responsive Design** - Works on desktop and mobile devices

### Planned Features
- Advanced bulk operations
- Schema analysis and visualization  
- Index management and suggestions
- Real-time monitoring
- Query performance profiling
- Team collaboration features
- Custom export formats

## 🚀 Quick Start

### Prerequisites
- Node.js 16+ 
- MongoDB instance (local or remote)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/mongodb-web-manager.git
   cd mongodb-web-manager
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the development server**
   ```bash
   npm run dev
   ```

4. **Open your browser**
   Navigate to `http://localhost:3000`

## 🔧 Configuration

### Environment Variables

Create a `.env` file in the root directory:

```bash
# Server port (default: 3000)
PORT=3000

# Environment
NODE_ENV=development
```

### Connection

The application supports any standard MongoDB connection string:

- **Local MongoDB**: `mongodb://localhost:27017`
- **MongoDB Atlas**: `mongodb+srv://username:password@cluster.mongodb.net`
- **With Authentication**: `mongodb://user:pass@localhost:27017/authDB`

## 📖 Usage

### Connecting to MongoDB
1. Enter your MongoDB connection string
2. Optionally specify a default database
3. Click "Connect"

### Browsing Data  
1. Expand databases in the sidebar
2. Click on any collection to view documents
3. Use pagination controls to navigate large collections

### Running Queries
1. Switch to the "Query" tab
2. Select database and collection
3. Enter your query JSON (e.g., `{"status": "active"}`)
4. Choose operation type and execute

## 🛠️ Development

### Project Structure
```
mongodb-web-manager/
├── server.js              # Express server and API routes
├── public/
│   ├── index.html         # Main HTML file
│   ├── styles.css         # CSS styles
│   └── app.js             # Frontend JavaScript
├── package.json
└── README.md
```

### Available Scripts

- `npm start` - Start production server
- `npm run dev` - Start development server with nodemon
- `npm test` - Run tests (coming soon)

### API Endpoints

- `POST /api/connect` - Connect to MongoDB
- `GET /api/databases` - List databases
- `GET