import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

export const useGoogleAuth = () => {
  const { loginWithGoogle } = useAuth();
  const navigate = useNavigate();

  const handleGoogleSuccess = async (response: any) => {
    try {
      console.log("Google login response:", response);

      // Validación de respuesta de Google
      if (!response || !response.credential) {
        console.error("Respuesta de Google inválida:", response);
        toast.error("No se pudo obtener información de Google");
        return;
      }

      // Decodificar el JWT token de Google
      const token = response.credential;

      try {
        // Decodificar el payload del token JWT (segunda parte del token)
        const base64Url = token.split(".")[1];
        const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
        const jsonPayload = decodeURIComponent(
          atob(base64)
            .split("")
            .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
            .join("")
        );

        const payload = JSON.parse(jsonPayload);
        console.log("Google user info:", payload);

        if (!payload.email) {
          toast.error("No se pudo obtener el email de Google");
          return;
        }

        // Llamamos a loginWithGoogle con los datos obtenidos
        await loginWithGoogle({
          username: payload.email,
          password: "", // No necesitamos password para OAuth
          isGoogleAuth: true,
          googleToken: token,
        });

        // Redirigimos al usuario al dashboard
        toast.success(`¡Bienvenido ${payload.name || payload.email}!`);
        navigate("/");
      } catch (decodeError) {
        console.error("Error al decodificar token de Google:", decodeError);
        toast.error("Error al procesar la respuesta de Google");
      }
    } catch (error) {
      console.error("Error en Google login:", error);
      toast.error("Error al iniciar sesión con Google");
    }
  };

  const handleGoogleError = (error: any) => {
    console.error("Error de Google:", error);
    // En lugar de lanzar un error, podemos mostrar una notificación al usuario
    // y manejar el error de manera más amigable
    toast.error(error?.error || "Error al iniciar sesión con Google");
    return; // No lanzamos un error, solo devolvemos
  };

  return {
    handleGoogleSuccess,
    handleGoogleError,
  };
};
