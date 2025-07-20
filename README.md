# UI Component Libraries Showcase

မင်္ဂလာပါ! Welcome to our comprehensive UI component libraries showcase built with React + TypeScript + Vite.

## 🚀 Production Deployment

### Quick Deployment Commands

```bash
# Complete deployment (Backend + Frontend)
npm run deploy

# Individual deployments
npm run deploy:backend    # Backend services only
npm run deploy:frontend   # Frontend web app only

# Build and test locally
npm run build:prod
npm run preview:prod
```

### Deployment Guide
See [DEPLOYMENT-GUIDE.md](DEPLOYMENT-GUIDE.md) for complete instructions.

## 🚀 Installed UI Libraries

### ✅ Successfully Installed

1. **DaisyUI** - Tailwind CSS component library
   - Version: Latest
   - Features: 50+ components, 25+ themes, dark mode support
   - Usage: Use classes like `btn`, `card`, `alert`, etc.

2. **Magic UI** (Manual Components)
   - Version: Copy-paste components from magicui.design
   - Features: Animated components with framer-motion
   - Dependencies: `framer-motion` installed

3. **Aceternity UI** 
   - Version: Latest
   - Features: Modern UI components with animations
   - Status: ✅ Installed successfully

4. **React UniUI**
   - Version: Latest  
   - Features: React TypeScript UI library
   - Status: ✅ Installed successfully

5. **Float UI**
   - Type: Copy-paste Tailwind components
   - Source: floatui.com
   - Usage: Copy components from their website

### ⚠️ Installation Issues

1. **Unis-UI** - Failed due to React version conflict
   - Requires: React 18.2.0
   - Current: React 19.1.0
   - Solution: Use `--legacy-peer-deps` if needed

2. **Universe** - Design system (Figma-based)
   - Not an npm package
   - Available as Figma design system

3. **Mailgoui** - Not found as exact package
   - Alternative: MailingUI (email components)
   - Alternative: Mailgo (email modal library)

## 🛠️ Tech Stack

- **React** 19.1.0
- **TypeScript** 
- **Vite** (Build tool)
- **Tailwind CSS** (Styling)
- **DaisyUI** (Component library)
- **Framer Motion** (Animations)
- **Aceternity UI** (Modern components)

## 🎨 Features

### DaisyUI Components
- Buttons (Primary, Secondary, Accent, Warning, Error, Success)
- Form elements (Input, Select, Checkbox, Radio)
- Cards and Alerts
- Navigation (Navbar, Footer)
- Layout components
- 25+ built-in themes
- Dark/Light mode toggle

### Magic UI Animations
- Floating cards with hover effects
- Animated progress bars
- Smooth transitions
- Framer Motion integration

### Aceternity UI Style
- Neon effects and glowing text
- Cyberpunk aesthetics
- Gradient backgrounds
- Interactive hover states

### Theme System
- Light/Dark mode toggle
- 25+ DaisyUI themes available
- Smooth theme transitions
- Responsive design

## 🚀 Getting Started

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Start development server:**
   ```bash
   npm run dev
   ```

3. **Build for production:**
   ```bash
   npm run build:prod
   ```

4. **Deploy to production:**
   ```bash
   npm run deploy
   ```

## 📱 Demo Features

- **Header** with theme toggle (🌙/☀️)
- **Hero Section** with animated greeting in Myanmar
- **DaisyUI Showcase** with various components
- **Magic UI Animations** with floating cards and progress bars
- **Aceternity UI Style** with neon effects
- **Statistics Section** showing library features
- **Responsive Design** works on all devices

## 🎯 How to Use Each Library

### DaisyUI
```jsx
// Use DaisyUI classes directly
<button className="btn btn-primary">Primary Button</button>
<div className="card bg-base-100 shadow-xl">
  <div className="card-body">
    <h2 className="card-title">Card Title</h2>
    <p>Card content</p>
  </div>
</div>
```

### Magic UI (with Framer Motion)
```jsx
import { motion } from 'framer-motion'

<motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  whileHover={{ scale: 1.05 }}
  className="card"
>
  Content
</motion.div>
```

### Aceternity UI Style
```jsx
<div className="border border-cyan-400 rounded-lg p-6 hover:shadow-neon">
  <h3 className="text-cyan-400">Neon Card</h3>
  <p className="text-gray-300">Cyberpunk aesthetics</p>
</div>
```

## 🌈 Available Themes

DaisyUI comes with 25+ themes:
- light, dark, cupcake, bumblebee, emerald
- corporate, synthwave, retro, cyberpunk, valentine
- halloween, garden, forest, aqua, lofi, pastel
- fantasy, wireframe, black, luxury, dracula
- cmyk, autumn, business, acid, lemonade, night, coffee, winter

## 🔧 Configuration

### Tailwind Config
```js
// tailwind.config.js
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./node_modules/react-uniui/**/*.{js,jsx,ts,tsx}",
  ],
  plugins: [require('daisyui')],
  daisyui: {
    themes: ["light", "dark", /* ...all themes */],
  },
}
```

### Theme Toggle
```jsx
const toggleTheme = () => {
  const newTheme = theme === 'light' ? 'dark' : 'light'
  setTheme(newTheme)
  document.documentElement.setAttribute('data-theme', newTheme)
}
```

## 📖 Documentation Links

- [DaisyUI Documentation](https://daisyui.com/)
- [Magic UI Components](https://magicui.design/)
- [Aceternity UI](https://ui.aceternity.com/)
- [Framer Motion](https://www.framer.com/motion/)
- [Tailwind CSS](https://tailwindcss.com/)

## 🤝 Contributing

Feel free to add more components or improve existing ones:

1. Fork the repository
2. Create your feature branch
3. Add new UI components
4. Test with different themes
5. Submit a pull request

## 📄 License

This project is open source and available under the MIT License.

---

**Built with ❤️ using modern web technologies**

**Production-ready Member Card System! 🚀**

Enjoy exploring the beautiful UI components! 🎉
