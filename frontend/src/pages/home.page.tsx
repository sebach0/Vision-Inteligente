import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, Shield, Camera, Lock, CheckCircle2 } from "lucide-react";

export default function HomePage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen relative">
      {/* Fondo con imagen */}
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{
          backgroundImage:
            "url('/image.png')",
        }}
      />
      {/* Overlay oscuro para contraste */}
      <div className="absolute inset-0 bg-gradient-to-br from-black/70 via-black/60 to-blue-900/70" />

      {/* Contenido */}
      <div className="relative z-10 min-h-screen flex flex-col">
        {/* Header / Navbar */}
        <header className="w-full px-6 py-4">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            {/* Logo/Nombre del proyecto - Clickeable */}
            <button
              onClick={() => navigate("/admin")}
              className="text-white hover:text-blue-300 transition-colors duration-200 text-lg font-semibold tracking-tight flex items-center gap-2"
            >
              <Shield className="w-5 h-5" />
              <span>Visión Inteligente</span>
            </button>

            {/* Botones de navegación */}
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                className="text-white hover:text-blue-300 hover:bg-white/10"
                onClick={() => navigate("/admin")}
              >
                Iniciar Sesión
              </Button>
            </div>
          </div>
        </header>

        {/* Hero Section */}
        <main className="flex-1 flex items-center justify-center px-6">
          <div className="max-w-6xl mx-auto text-center">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 bg-blue-500/20 border border-blue-400/30 rounded-full px-4 py-2 mb-8">
              <Camera className="w-4 h-4 text-blue-300" />
              <span className="text-blue-200 text-sm font-medium">
                Sistema de Control Vehicular Inteligente
              </span>
            </div>

            {/* Título principal */}
            <h1 className="text-5xl md:text-7xl font-bold text-white mb-6 leading-tight">
              Control de Acceso
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-300">
                con Visión Artificial
              </span>
            </h1>

            {/* Descripción */}
            <p className="text-xl md:text-2xl text-gray-300 mb-12 max-w-3xl mx-auto leading-relaxed">
              Gestiona el acceso vehicular de forma automatizada con tecnología
              de reconocimiento de placas y vehículos en tiempo real.
            </p>

            {/* Botones de acción */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
              <Button
                size="lg"
                className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-6 text-lg rounded-xl shadow-lg shadow-blue-500/25"
                onClick={() => navigate("/registro-vehiculo")}
              >
                Registra tu Auto
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </div>

            {/* Características */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
              <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 hover:bg-white/10 transition-all duration-300">
                <div className="bg-blue-500/20 w-12 h-12 rounded-xl flex items-center justify-center mb-4 mx-auto">
                  <Camera className="w-6 h-6 text-blue-300" />
                </div>
                <h3 className="text-white font-semibold text-lg mb-2">
                  Reconocimiento Automático
                </h3>
                <p className="text-gray-400 text-sm">
                  Detección y lectura de placas vehiculares mediante IA
                </p>
              </div>

              <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 hover:bg-white/10 transition-all duration-300">
                <div className="bg-blue-500/20 w-12 h-12 rounded-xl flex items-center justify-center mb-4 mx-auto">
                  <Lock className="w-6 h-6 text-blue-300" />
                </div>
                <h3 className="text-white font-semibold text-lg mb-2">
                  Control Seguro
                </h3>
                <p className="text-gray-400 text-sm">
                  Gestión controlada de accesos con registro detallado
                </p>
              </div>

              <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 hover:bg-white/10 transition-all duration-300">
                <div className="bg-blue-500/20 w-12 h-12 rounded-xl flex items-center justify-center mb-4 mx-auto">
                  <CheckCircle2 className="w-6 h-6 text-blue-300" />
                </div>
                <h3 className="text-white font-semibold text-lg mb-2">
                  Tiempo Real
                </h3>
                <p className="text-gray-400 text-sm">
                  Monitoreo y control instantáneo de entradas y salidas
                </p>
              </div>
            </div>
          </div>
        </main>

        {/* Footer */}
        <footer className="w-full px-6 py-6">
          <div className="max-w-7xl mx-auto text-center">
            <p className="text-gray-400 text-sm">
              © 2026 Visión Inteligente. Sistema de Control de Acceso Vehicular.
            </p>
          </div>
        </footer>
      </div>
    </div>
  );
}
