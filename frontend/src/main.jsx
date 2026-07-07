import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import "./index.css";
import App from './App';
import 'leaflet/dist/leaflet.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <BrowserRouter>
    <App />
  </BrowserRouter>
);