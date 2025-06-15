# 🚀 SEO Assistant Frontend

A beautiful React frontend for the SEO Assistant powered by DataForSEO API and MCP (Model Context Protocol).

## ✨ Features

- 🎯 **Real-time SEO Analysis** - Get instant SEO insights and recommendations
- 📊 **DataForSEO Integration** - Access 49+ powerful SEO tools
- 💬 **AI-Powered Chat** - Interactive SEO assistant with streaming responses
- 🎨 **Modern UI** - Clean, responsive design with real-time updates
- ⚡ **Fast Performance** - Built with React and optimized for speed

## 🚀 Quick Deploy to Railway

### 1. **Create New Railway Project**
```bash
# Fork or clone this repository
git clone <your-repo-url>
cd seo-assistant-frontend

# Deploy to Railway
railway login
railway init
railway up
```

### 2. **Set Environment Variables**
In Railway dashboard, add this environment variable:

| Variable | Value | Description |
|----------|-------|-------------|
| `REACT_APP_BACKEND_URL` | `https://your-backend-url.railway.app` | Your SEO Assistant backend URL |

**Example:**
```
REACT_APP_BACKEND_URL=https://seo-mcp-lessgoooo-production.up.railway.app
```

### 3. **That's It!** 🎉
Your frontend will be live at: `https://your-frontend-name.railway.app`

## 🛠️ Local Development

### Prerequisites
- Node.js 18+ 
- npm or yarn

### Setup
```bash
# Install dependencies
npm install

# Set environment variable
echo "REACT_APP_BACKEND_URL=https://your-backend-url.railway.app" > .env.local

# Start development server
npm start
```

Visit `http://localhost:3000` to see your app!

## 📁 Project Structure

```
src/
├── App.js          # Main application component
├── App.css         # Styles and animations
├── index.js        # React entry point
└── index.css       # Global styles

public/
├── index.html      # HTML template
└── favicon.ico     # App icon

Procfile            # Railway deployment config
package.json        # Dependencies and scripts
```

## 🔧 Configuration

### Backend Connection
The frontend connects to your SEO Assistant backend via the `REACT_APP_BACKEND_URL` environment variable.

**Production:** Set in Railway dashboard  
**Development:** Set in `.env.local` file

### API Endpoints Used
- `GET /` - Health check
- `POST /chat/stream` - Streaming SEO chat responses

## 🎨 Customization

### Styling
- Edit `src/App.css` for component styles
- Edit `src/index.css` for global styles
- Colors, fonts, and layout can be easily customized

### Features
- Add new chat features in `src/App.js`
- Modify the UI components as needed
- Extend with additional SEO tools

## 🚀 Deployment Options

### Railway (Recommended)
1. Connect your GitHub repository
2. Set `REACT_APP_BACKEND_URL` environment variable
3. Deploy automatically on push

### Other Platforms
- **Vercel:** Works out of the box
- **Netlify:** Add build command: `npm run build`
- **Heroku:** Procfile included

## 🔍 Troubleshooting

### Frontend won't connect to backend
- ✅ Check `REACT_APP_BACKEND_URL` is set correctly
- ✅ Ensure backend is deployed and accessible
- ✅ Check browser console for CORS errors

### Build fails
- ✅ Run `npm install` to ensure dependencies are installed
- ✅ Check Node.js version (18+ required)
- ✅ Clear cache: `npm start -- --reset-cache`

## 📞 Support

If you need help:
1. Check the backend is running at your `REACT_APP_BACKEND_URL`
2. Verify environment variables are set correctly
3. Check browser developer console for errors

## 🎉 You're Ready!

Your SEO Assistant frontend is ready to deploy! Just set the backend URL and you're good to go! 🚀
