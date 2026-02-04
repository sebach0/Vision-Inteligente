import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Mail, Shield, AlertCircle, CheckCircle } from "lucide-react";
import { api } from "@/lib/api";

interface LocationState {
  email: string;
  username: string;
}

const CodeVerificationPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { email, username } = (location.state as LocationState) || {};

  const [code, setCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [resendCountdown, setResendCountdown] = useState(0);
  const [isResending, setIsResending] = useState(false);

  // Redirigir si no hay datos de email
  useEffect(() => {
    if (!email || !username) {
      navigate("/admin");
    }
  }, [email, username, navigate]);

  // Enviar código automáticamente al cargar
  useEffect(() => {
    if (email) {
      sendVerificationCode();
    }
  }, [email]);

  // Countdown para reenvío
  useEffect(() => {
    if (resendCountdown > 0) {
      const timer = setTimeout(() => {
        setResendCountdown(resendCountdown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCountdown]);

  const sendVerificationCode = async () => {
    try {
      await api.post("/api/admin/mobile/send-code/", { email });

      setSuccess("Código de verificación enviado exitosamente");
      setError(null);
      setResendCountdown(60); // 60 segundos de espera
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.error || "Error al enviar código";
      setError(errorMessage);
      setSuccess(null);

      // Si es error de rate limiting, ajustar el countdown
      if (error.response?.status === 429 && error.response?.data?.error) {
        // Extraer tiempo de espera del mensaje si está disponible
        const waitMatch = error.response.data.error.match(/(\d+) segundos/);
        if (waitMatch) {
          setResendCountdown(parseInt(waitMatch[1]));
        } else {
          setResendCountdown(60);
        }
      }
    }
  };

  const verifyCode = async () => {
    if (!code.trim()) {
      setError("Por favor ingresa el código");
      return;
    }

    if (code.length !== 6 || !/^\d{6}$/.test(code)) {
      setError("El código debe tener 6 dígitos");
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      await api.post("/api/admin/mobile/verify-code/", { email, code });

      setSuccess("¡Email verificado exitosamente!");
      setTimeout(() => {
        navigate("/admin", {
          state: {
            message:
              "Cuenta verificada exitosamente. Ya puedes iniciar sesión.",
          },
        });
      }, 2000);
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.error ||
        error.response?.data?.detail ||
        "Código incorrecto";
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const resendCode = async () => {
    if (resendCountdown > 0) return;

    setIsResending(true);
    setError(null);
    setSuccess(null);

    try {
      await api.post("/api/admin/mobile/resend-code/", { email });

      setSuccess("Código reenviado exitosamente");
      setResendCountdown(60);
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.error || "Error al reenviar código";
      setError(errorMessage);

      // Si es error de rate limiting, ajustar el countdown
      if (error.response?.status === 429 && error.response?.data?.error) {
        const waitMatch = error.response.data.error.match(/(\d+) segundos/);
        if (waitMatch) {
          setResendCountdown(parseInt(waitMatch[1]));
        } else {
          setResendCountdown(60);
        }
      }
    } finally {
      setIsResending(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, "").slice(0, 6);
    setCode(value);
  };

  if (!email || !username) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 p-3 bg-green-100 rounded-full w-fit">
            <Mail className="h-8 w-8 text-green-600" />
          </div>
          <CardTitle className="text-2xl font-bold text-green-800">
            Verificación de Email
          </CardTitle>
          <CardDescription>
            Ingresa el código de 6 dígitos que enviamos a tu correo
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Información del usuario */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <p className="text-sm text-green-700">
              <strong>Hola {username}</strong>
            </p>
            <p className="text-sm text-green-600 mt-1">
              Hemos enviado un código de verificación a:
            </p>
            <p className="text-sm font-semibold text-green-800 mt-1">{email}</p>
          </div>

          {/* Campo de código */}
          <div className="space-y-2">
            <label htmlFor="code" className="text-sm font-medium text-gray-700">
              Código de verificación
            </label>
            <div className="relative">
              <Shield className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <Input
                id="code"
                type="text"
                value={code}
                onChange={handleInputChange}
                placeholder="123456"
                className="pl-10 text-center text-2xl font-mono tracking-widest"
                maxLength={6}
                disabled={isLoading}
              />
            </div>
            <p className="text-xs text-gray-500">
              Ingresa el código de 6 dígitos que recibiste por email
            </p>
          </div>

          {/* Mensajes de estado */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-700">
                {success}
              </AlertDescription>
            </Alert>
          )}

          {/* Botón de verificar */}
          <Button
            onClick={verifyCode}
            disabled={isLoading || code.length !== 6}
            className="w-full bg-green-600 hover:bg-green-700"
            size="lg"
          >
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                Verificando...
              </>
            ) : (
              "Verificar Código"
            )}
          </Button>

          {/* Botón de reenviar */}
          <Button
            onClick={resendCode}
            disabled={resendCountdown > 0 || isResending}
            variant="outline"
            className="w-full"
            size="lg"
          >
            {isResending ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600 mr-2" />
                Reenviando...
              </>
            ) : resendCountdown > 0 ? (
              `Reenviar código en ${resendCountdown}s`
            ) : (
              "Reenviar Código"
            )}
          </Button>

          {/* Información adicional */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-medium text-blue-800 mb-2">
              Información importante
            </h4>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• El código expira en 15 minutos</li>
              <li>• Revisa tu carpeta de spam si no recibes el email</li>
              <li>• No compartas este código con nadie</li>
            </ul>
          </div>

          {/* Botón para volver al registro */}
          <Button
            onClick={() => navigate("/register")}
            variant="ghost"
            className="w-full text-gray-600"
          >
            Volver al registro
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default CodeVerificationPage;
