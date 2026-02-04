import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import TransporteIcon from "@/components/app-logo";
import {
  Mail,
  CheckCircle,
  AlertCircle,
  ArrowLeft,
  RefreshCw,
} from "lucide-react";
import { clientAuthService, ApiError } from "@/services/api";

export default function EmailVerificationPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [verificationKey, setVerificationKey] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [status, setStatus] = useState<
    "pending" | "success" | "error" | "resend"
  >("pending");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  // Verificar si hay un key en la URL o si ya fue verificado
  useEffect(() => {
    const key = searchParams.get("key");
    const verified = searchParams.get("verified");
    
    if (verified === "true") {
      setStatus("success");
      setMessage("¡Email verificado exitosamente! Ya puedes iniciar sesión.");
      // Redirigir al login admin después de 3 segundos
      setTimeout(() => {
        navigate("/admin");
      }, 3000);
    } else if (key) {
      setVerificationKey(key);
      handleVerifyEmail(key);
    }
  }, [searchParams]);

  const handleVerifyEmail = async (key?: string) => {
    const keyToUse = key || verificationKey;
    if (!keyToUse) {
      setError("Por favor ingresa el código de verificación");
      return;
    }

    setIsVerifying(true);
    setError("");

    try {
      const response = await clientAuthService.verifyEmail({ key: keyToUse });

      if (response.success) {
        setStatus("success");
        setMessage("¡Email verificado exitosamente! Ya puedes iniciar sesión.");

        // Redirigir al login admin después de 3 segundos
        setTimeout(() => {
          navigate("/admin");
        }, 3000);
      } else {
        throw new Error(response.error || "Error al verificar el email");
      }
    } catch (error) {
      setStatus("error");
      if (error instanceof ApiError) {
        setError(error.message);
      } else {
        setError("Error al verificar el email. Por favor intenta nuevamente.");
      }
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResendVerification = async () => {
    setIsResending(true);
    setError("");

    try {
      const response = await clientAuthService.resendEmailVerification();

      if (response.success) {
        setStatus("resend");
        setMessage(
          "Se ha reenviado el enlace de verificación. Revisa tu bandeja de entrada."
        );
      } else {
        throw new Error(response.error || "Error al reenviar el email");
      }
    } catch (error) {
      if (error instanceof ApiError) {
        setError(error.message);
      } else {
        setError("Error al reenviar el email. Por favor intenta nuevamente.");
      }
    } finally {
      setIsResending(false);
    }
  };

  const goToLogin = () => {
    navigate("/admin");
  };

  const goBack = () => {
    navigate(-1);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <TransporteIcon className="w-7 h-7" />
              <span className="text-lg font-bold text-blue-700">MoviFleet</span>
            </div>
            <Button
              variant="outline"
              type="button"
              onClick={goBack}
              className="flex items-center px-4 py-2 text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Volver
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-md mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
          {/* Icono de estado */}
          <div className="flex justify-center mb-6">
            {status === "success" ? (
              <CheckCircle className="w-16 h-16 text-green-500" />
            ) : status === "error" ? (
              <AlertCircle className="w-16 h-16 text-red-500" />
            ) : (
              <Mail className="w-16 h-16 text-blue-500" />
            )}
          </div>

          {/* Título */}
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              {status === "success"
                ? "¡Email Verificado!"
                : status === "error"
                ? "Error de Verificación"
                : status === "resend"
                ? "Email Reenviado"
                : "Verifica tu Email"}
            </h2>
            <p className="text-gray-600">
              {status === "success"
                ? "Tu cuenta ha sido verificada exitosamente"
                : status === "error"
                ? "Hubo un problema al verificar tu email"
                : status === "resend"
                ? "Se ha reenviado el email de verificación"
                : "Haz clic en el enlace que te enviamos por email para verificar tu cuenta"}
            </p>
          </div>

          {/* Mensaje */}
          {(message || error) && (
            <div
              className={`p-4 rounded-lg mb-6 ${
                error
                  ? "bg-red-50 border border-red-200"
                  : "bg-green-50 border border-green-200"
              }`}
            >
              <p
                className={`text-sm ${
                  error ? "text-red-700" : "text-green-700"
                }`}
              >
                {error || message}
              </p>
            </div>
          )}

          {/* Mensaje de verificación por enlace */}
          {status === "pending" && !searchParams.get("key") && (
            <div className="space-y-4">
              <div className="text-center p-6 bg-blue-50 rounded-lg border border-blue-200">
                <Mail className="w-12 h-12 text-blue-500 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-blue-900 mb-2">
                  Revisa tu correo electrónico
                </h3>
                <p className="text-blue-700 mb-4">
                  Te hemos enviado un enlace de verificación a tu correo electrónico.
                  <br />
                  <strong>Haz clic en el enlace para verificar tu cuenta.</strong>
                </p>
                <div className="text-sm text-blue-600">
                  <p>• El enlace puede tardar unos minutos en llegar</p>
                  <p>• Revisa también tu carpeta de spam</p>
                  <p>• El enlace expira en 24 horas</p>
                </div>
              </div>
            </div>
          )}

          {/* Botones de acción */}
          <div className="space-y-3 mt-6">
            {status === "success" && (
              <Button
                onClick={goToLogin}
                className="w-full py-3 px-4 font-medium bg-green-600 hover:bg-green-700"
              >
                Ir al Login
              </Button>
            )}

            {status === "error" && (
              <div className="space-y-3">
                <Button
                  onClick={() => setStatus("pending")}
                  className="w-full py-3 px-4 font-medium bg-blue-600 hover:bg-blue-700"
                >
                  Intentar Nuevamente
                </Button>
                <Button
                  onClick={handleResendVerification}
                  disabled={isResending}
                  variant="outline"
                  className="w-full py-3 px-4 font-medium"
                >
                  {isResending ? (
                    <div className="flex items-center justify-center">
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Reenviando...
                    </div>
                  ) : (
                    "Reenviar Email de Verificación"
                  )}
                </Button>
              </div>
            )}

            {status === "resend" && (
              <Button
                onClick={goToLogin}
                className="w-full py-3 px-4 font-medium bg-blue-600 hover:bg-blue-700"
              >
                Ir al Login
              </Button>
            )}

            {status === "pending" && (
              <Button
                onClick={handleResendVerification}
                disabled={isResending}
                variant="outline"
                className="w-full py-3 px-4 font-medium"
              >
                {isResending ? (
                  <div className="flex items-center justify-center">
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Reenviando...
                  </div>
                ) : (
                  "Reenviar Enlace de Verificación"
                )}
              </Button>
            )}
          </div>

          {/* Información adicional */}
          <div className="mt-8 p-4 bg-blue-50 rounded-lg">
            <h3 className="text-sm font-medium text-blue-900 mb-2">
              ¿No recibiste el enlace de verificación?
            </h3>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• Revisa tu carpeta de spam o correo no deseado</li>
              <li>• Asegúrate de que el email esté escrito correctamente</li>
              <li>• El email puede tardar unos minutos en llegar</li>
              <li>• Haz clic en "Reenviar Email" si es necesario</li>
              <li>• El enlace expira en 24 horas por seguridad</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
