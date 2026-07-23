/**
 * App — árbol de rutas.
 *
 * Públicas: portada, directorio y perfil de proveedor. Protegidas (requieren
 * sesión): panel y ajustes. Todo bajo el layout con navegación por rol.
 */
import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';
import { lazy } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { ProtectedRoute } from '@/components/layout/ProtectedRoute';
import { Home } from '@/pages/Home';
import { Book } from '@/pages/Book';

// Carga diferida de las rutas pesadas (mapa, gráficas, escáner) para no inflar
// el bundle inicial. El AppLayout provee el Suspense boundary.
const Directory = lazy(() => import('@/pages/Directory').then((m) => ({ default: m.Directory })));
const ProviderProfile = lazy(() =>
  import('@/pages/ProviderProfile').then((m) => ({ default: m.ProviderProfile })),
);
const Dashboard = lazy(() => import('@/pages/Dashboard').then((m) => ({ default: m.Dashboard })));
const Auth = lazy(() => import('@/pages/Auth').then((m) => ({ default: m.Auth })));
const Settings = lazy(() => import('@/pages/Settings').then((m) => ({ default: m.Settings })));
const SharedList = lazy(() => import('@/pages/SharedList').then((m) => ({ default: m.SharedList })));
const Terms = lazy(() => import('@/pages/Terms').then((m) => ({ default: m.Terms })));
const Privacy = lazy(() => import('@/pages/Privacy').then((m) => ({ default: m.Privacy })));
const InfoNeuromundi = lazy(() =>
  import('@/pages/InfoNeuromundi').then((m) => ({ default: m.InfoNeuromundi })),
);
const Rules = lazy(() => import('@/pages/Rules').then((m) => ({ default: m.Rules })));
const Post = lazy(() => import('@/pages/Post').then((m) => ({ default: m.Post })));
const SearchPage = lazy(() => import('@/pages/SearchPage').then((m) => ({ default: m.SearchPage })));
const Store = lazy(() => import('@/pages/Store').then((m) => ({ default: m.Store })));
const SchoolInclusion = lazy(() => import('@/pages/SchoolInclusion').then((m) => ({ default: m.SchoolInclusion })));
const Academy = lazy(() => import('@/pages/Academy').then((m) => ({ default: m.Academy })));
const DataProtection = lazy(() => import('@/pages/DataProtection').then((m) => ({ default: m.DataProtection })));
const AskExpert = lazy(() => import('@/pages/AskExpert').then((m) => ({ default: m.AskExpert })));
const CreateAccount = lazy(() => import('@/pages/CreateAccount').then((m) => ({ default: m.CreateAccount })));
const Course = lazy(() => import('@/pages/Course').then((m) => ({ default: m.Course })));
const Toolkit = lazy(() => import('@/pages/Toolkit').then((m) => ({ default: m.Toolkit })));
const Blog = lazy(() => import('@/pages/Blog').then((m) => ({ default: m.Blog })));
const Author = lazy(() => import('@/pages/Author').then((m) => ({ default: m.Author })));
const Manifiesto = lazy(() => import('@/pages/Manifiesto').then((m) => ({ default: m.Manifiesto })));
const Donate = lazy(() => import('@/pages/Donate').then((m) => ({ default: m.Donate })));
const DonorWall = lazy(() => import('@/pages/DonorWall').then((m) => ({ default: m.DonorWall })));
const Events = lazy(() => import('@/pages/Events').then((m) => ({ default: m.Events })));
const CalendarPage = lazy(() => import('@/pages/Calendar').then((m) => ({ default: m.Calendar })));
const Messages = lazy(() => import('@/pages/Messages').then((m) => ({ default: m.Messages })));

const router = createBrowserRouter([
  {
    element: <AppLayout />,
    children: [
      { path: '/', element: <Home /> },
      { path: '/directorio', element: <Directory /> },
      { path: '/proveedor/:id', element: <ProviderProfile /> },
      { path: '/lista/:token', element: <SharedList /> },
      { path: '/terminos', element: <Terms /> },
      { path: '/privacidad', element: <Privacy /> },
      { path: '/conocer-mas', element: <InfoNeuromundi /> },
      { path: '/reglamento', element: <Rules /> },
      { path: '/contenido/:id', element: <Post /> },
      { path: '/buscar', element: <SearchPage /> },
      { path: '/tienda', element: <Store /> },
      { path: '/eventos', element: <Events /> },
      { path: '/inclusion-escolar', element: <SchoolInclusion /> },
      { path: '/proteccion-datos', element: <DataProtection /> },
      { path: '/pregunta-al-experto', element: <AskExpert /> },
      { path: '/crear-cuenta', element: <CreateAccount /> },
      { path: '/academy', element: <Academy /> },
      { path: '/academy/:id', element: <Course /> },
      { path: '/kit', element: <Toolkit /> },
      { path: '/blog', element: <Blog /> },
      { path: '/autor/:id', element: <Author /> },
      { path: '/manifiesto', element: <Manifiesto /> },
      { path: '/donar', element: <Donate /> },
      { path: '/donantes', element: <DonorWall /> },
      { path: '/entrar', element: <Auth /> },
      {
        element: <ProtectedRoute />,
        children: [
          { path: '/panel', element: <Dashboard /> },
          { path: '/ajustes', element: <Settings /> },
          { path: '/calendario', element: <CalendarPage /> },
          { path: '/mensajes', element: <Messages /> },
        ],
      },
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
  { path: '/reservar/:memberNo', element: <Book /> },
]);

export function App() {
  return <RouterProvider router={router} />;
}
