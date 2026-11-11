/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // Igual que en Tarados Malibú: que al volver a una página no se vean
    // datos de hace 30 s (p. ej. justo después de registrar la jugada).
    staleTimes: {
      dynamic: 10,
    },
  },
};

export default nextConfig;
