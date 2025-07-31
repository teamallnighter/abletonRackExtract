# The Ableton Cookbook 📚

A community-driven platform for sharing and discovering Ableton Live rack recipes. Upload, analyze, and explore audio effect racks (.adg) and instrument racks (.adv) to learn from the production techniques of fellow musicians.

## Features

### 🎛️ Rack Analysis
- Drag & drop .adg/.adv files for instant analysis
- Visualize complete rack structure with chains and devices
- View macro control mappings and values
- Explore nested racks within the signal flow
- Export analysis results as JSON or XML

### 👥 Community Features
- User authentication and profiles
- Share your rack recipes with descriptions and tags
- Search and discover racks by name, device, or tag
- Browse recent and popular rack recipes
- Download original rack files from other producers

### 🔒 Security & Performance
- Rate limiting to prevent abuse
- Input sanitization and validation
- Secure password hashing with bcrypt
- JWT authentication
- Security headers (CSP, HSTS, etc.)

## Tech Stack

- **Frontend**: Vanilla JavaScript with Jinja2 templating
- **Backend**: Flask (Python)
- **Database**: MongoDB
- **Authentication**: JWT tokens
- **Deployment**: Railway

## Project Structure

```
abletonRackExtract/
├── backend/
│   ├── app.py                 # Flask API server
│   ├── db.py                  # MongoDB integration
│   ├── security.py            # Security utilities
│   └── requirements.txt       # Python dependencies
├── templates/                 # Jinja2 templates
│   ├── base.html             # Base template with navigation
│   ├── index.html            # Home page
│   ├── search.html           # Browse recipes
│   ├── rack.html             # Individual rack view
│   ├── profile.html          # User profile
│   ├── login.html            # Login page
│   └── register.html         # Registration page
├── static/
│   ├── css/
│   │   └── styles.css        # Main styles
│   └── js/
│       ├── app.js            # Main app logic
│       ├── auth.js           # Authentication
│       ├── navigation.js     # Navigation menu
│       ├── profile.js        # Profile page
│       ├── rack.js           # Rack viewer
│       ├── sanitize.js       # Input sanitization
│       ├── search.js         # Search functionality
│       └── tokenManager.js   # Token management
├── abletonRackAnalyzer.py    # Core analysis engine
├── API_DOCUMENTATION.md      # API reference
└── README.md                 # This file
```

## Local Development

### Prerequisites
- Python 3.8+
- MongoDB (local or cloud instance)
- pip

### Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/abletonRackExtract.git
   cd abletonRackExtract
   ```

2. Install Python dependencies:
   ```bash
   pip install -r requirements.txt
   ```

3. Create a `.env` file in the project root:
   ```env
   MONGODB_URI=your_mongodb_connection_string
   JWT_SECRET_KEY=your_secret_key
   ALLOWED_ORIGINS=http://localhost:5001
   ```

4. Start the backend server:
   ```bash
   python backend/app.py
   ```

5. Open http://localhost:5001 in your browser

## Deployment

The app is configured for deployment on Railway:

1. Connect your GitHub repository to Railway
2. Add environment variables in Railway dashboard
3. Deploy!

The app will automatically use the `PORT` environment variable provided by Railway.

## API Documentation

See [API_DOCUMENTATION.md](API_DOCUMENTATION.md) for detailed API endpoints and usage.

## Contributing

We welcome contributions! Please:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

MIT License - feel free to use this in your own projects!

## Acknowledgments

Built with ❤️ for the Ableton Live community. Special thanks to all the producers sharing their knowledge and techniques through their rack designs.
