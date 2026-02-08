import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Car, User, Shield, Camera, Upload, X } from "lucide-react";
import toast from "react-hot-toast";
import { Separator } from "@/components/ui/separator";

interface TipoVehiculo {
  id: number;
  nombre: string;
}

interface Color {
  id: number;
  nombre: string;
}

export default function RegistroVehiculoPage() {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [tiposVehiculo, setTiposVehiculo] = useState<TipoVehiculo[]>([]);
  const [colores, setColores] = useState<Color[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Datos del cliente
  const [clienteData, setClienteData] = useState({
    nombre: "",
    apellido: "",
    cedula: "",
    telefono: "",
    registro: "", // Opcional para estudiante/docente
  });

  // Datos del vehículo
  const [vehiculoData, setVehiculoData] = useState({
    placa: "",
    color_id: "",
    tipo_vehiculo_id: "",
  });

  // Estado para la imagen del vehículo
  const [imagenBase64, setImagenBase64] = useState<string>("");
  const [imagenPreview, setImagenPreview] = useState<string>("");

  // Cargar catálogos al montar el componente
  useEffect(() => {
    cargarCatalogos();
  }, []);

  const cargarCatalogos = async () => {
    try {
      const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:8000";
      
      // Cargar tipos de vehículo
      const tiposResponse = await fetch(
        `${apiUrl}/api/acceso-vehicular/tipos-vehiculo/?activo=true`
      );
      if (tiposResponse.ok) {
        const tiposData = await tiposResponse.json();
        console.log("Tipos de vehículo cargados:", tiposData);
        // La respuesta viene paginada, extraer el array de results
        setTiposVehiculo(tiposData.results || tiposData);
      } else {
        console.error("Error al cargar tipos:", tiposResponse.status);
      }

      // Cargar colores
      const coloresResponse = await fetch(
        `${apiUrl}/api/acceso-vehicular/colores/?activo=true`
      );
      if (coloresResponse.ok) {
        const coloresData = await coloresResponse.json();
        console.log("Colores cargados:", coloresData);
        // La respuesta viene paginada, extraer el array de results
        setColores(coloresData.results || coloresData);
      } else {
        console.error("Error al cargar colores:", coloresResponse.status);
      }
    } catch (error) {
      console.error("Error al cargar catálogos:", error);
      toast.error("Error al cargar los datos del formulario");
    }
  };

  const handleClienteChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const { name, value } = e.target;
    setClienteData((prev) => ({ ...prev, [name]: value }));
  };

  const handleVehiculoChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const { name, value } = e.target;
    setVehiculoData((prev) => ({ ...prev, [name]: value }));
  };

  const handleImagenChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validar tipo de archivo
    if (!file.type.startsWith("image/")) {
      toast.error("Por favor seleccione un archivo de imagen válido");
      return;
    }

    // Validar tamaño (máximo 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("La imagen no debe superar los 5MB");
      return;
    }

    // Convertir a base64
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      // Remover el prefijo "data:image/...;base64,"
      const base64Data = base64String.split(",")[1] || "";
      setImagenBase64(base64Data);
      setImagenPreview(base64String);
    };
    reader.readAsDataURL(file);
  };

  const eliminarImagen = () => {
    setImagenBase64("");
    setImagenPreview("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // Validaciones básicas
    if (
      !clienteData.nombre ||
      !clienteData.apellido ||
      !clienteData.cedula ||
      !clienteData.telefono
    ) {
      toast.error("Por favor complete todos los datos del cliente");
      return;
    }

    if (
      !vehiculoData.placa ||
      !vehiculoData.color_id ||
      !vehiculoData.tipo_vehiculo_id
    ) {
      toast.error("Por favor complete todos los datos del vehículo");
      return;
    }

    // Validar que se haya subido una foto
    if (!imagenBase64) {
      toast.error("Por favor suba una foto del vehículo");
      return;
    }

    setIsSubmitting(true);

    try {
      const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:8000";
      
      // Preparar datos para el registro de acceso
      // Nota: Se requiere un puerta_id. Asumimos Puerta 1 por defecto para registros públicos
      const registroData: any = {
        tipo_evento: "entrada",
        puerta_id: 1, // Puerta por defecto para registros públicos
        placa: vehiculoData.placa.toUpperCase(),
        tipo_vehiculo_id: parseInt(vehiculoData.tipo_vehiculo_id),
        color_id: parseInt(vehiculoData.color_id),
        observaciones: `Registro público - ${clienteData.nombre} ${clienteData.apellido} - CI: ${clienteData.cedula} - Tel: ${clienteData.telefono}${clienteData.registro ? ` - Registro: ${clienteData.registro}` : ""}`,
      };

      // Agregar imagen si fue cargada
      if (imagenBase64) {
        registroData.imagen_base64 = imagenBase64;
      }

      // Enviar al backend
      const response = await fetch(`${apiUrl}/api/acceso-vehicular/registros/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(registroData),
      });

      if (!response.ok) {
        let errorMessage = "Error al registrar el vehículo";
        try {
          const errorData = await response.json();
          console.error("Error al registrar:", errorData);
          // Manejar diferentes formatos de error
          if (errorData.detail) {
            errorMessage = errorData.detail;
          } else if (errorData.puerta_id) {
            errorMessage = `Error en puerta: ${errorData.puerta_id}`;
          } else if (errorData.tipo_vehiculo_id) {
            errorMessage = `Error en tipo de vehículo: ${errorData.tipo_vehiculo_id}`;
          } else if (errorData.color_id) {
            errorMessage = `Error en color: ${errorData.color_id}`;
          } else if (typeof errorData === 'string') {
            errorMessage = errorData;
          }
        } catch (e) {
          // Si no se puede parsear el JSON (ej: HTML error page)
          console.error("Error parsing response:", e);
          errorMessage = `Error del servidor (${response.status}). Por favor verifica que los catálogos estén configurados.`;
        }
        throw new Error(errorMessage);
      }

      const resultado = await response.json();
      console.log("Vehículo registrado:", resultado);

      toast.success("Vehículo Registrado");

      // Limpiar formulario
      setClienteData({
        nombre: "",
        apellido: "",
        cedula: "",
        telefono: "",
        registro: "",
      });
      setVehiculoData({
        placa: "",
        color_id: "",
        tipo_vehiculo_id: "",
      });
      eliminarImagen();

      // Redirigir después de 2 segundos
      setTimeout(() => {
        navigate("/");
      }, 2000);
    } catch (error) {
      console.error("Error al registrar:", error);
      toast.error("Error al registrar el vehículo");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header simple */}
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-2 text-gray-900 hover:text-blue-600 transition-colors"
          >
            <Shield className="w-5 h-5" />
            <span className="font-semibold">Visión Inteligente</span>
          </button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/")}
          >
            <ArrowLeft className="mr-2 w-4 h-4" />
            Volver
          </Button>
        </div>
      </header>

      {/* Contenido */}
      <div className="max-w-4xl mx-auto px-6 py-12">
        {/* Título */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Registro de Vehículo
          </h1>
          <p className="text-gray-600">
            Complete los datos para registrar su vehículo en el sistema
          </p>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit}>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5 text-blue-600" />
                Datos del Cliente
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="nombre">
                    Nombre <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="nombre"
                    name="nombre"
                    value={clienteData.nombre}
                    onChange={handleClienteChange}
                    placeholder="Ingrese su nombre"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="apellido">
                    Apellido <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="apellido"
                    name="apellido"
                    value={clienteData.apellido}
                    onChange={handleClienteChange}
                    placeholder="Ingrese su apellido"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cedula">
                    Cédula de Identidad <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="cedula"
                    name="cedula"
                    value={clienteData.cedula}
                    onChange={handleClienteChange}
                    placeholder="Ej: 12345678"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="telefono">
                    Teléfono <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="telefono"
                    name="telefono"
                    type="tel"
                    value={clienteData.telefono}
                    onChange={handleClienteChange}
                    placeholder="Ej: 76543210"
                    required
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="registro">
                    Código de Registro (Opcional)
                  </Label>
                  <Input
                    id="registro"
                    name="registro"
                    value={clienteData.registro}
                    onChange={handleClienteChange}
                    placeholder="Ej: 123456789"
                  />
                  <p className="text-sm text-muted-foreground">
                    Ingrese su código de registro si es estudiante o docente
                  </p>
                </div>
              </div>

              <Separator className="my-6" />

              <div className="mb-4">
                <h3 className="flex items-center gap-2 font-semibold text-lg">
                  <Car className="w-5 h-5 text-blue-600" />
                  Datos del Vehículo
                </h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="placa">
                    Placa <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="placa"
                    name="placa"
                    value={vehiculoData.placa}
                    onChange={handleVehiculoChange}
                    placeholder="Ej: 1234-ABC"
                    className="uppercase"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tipo_vehiculo_id">
                    Tipo de Vehículo <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={vehiculoData.tipo_vehiculo_id}
                    onValueChange={(value) =>
                      setVehiculoData((prev) => ({
                        ...prev,
                        tipo_vehiculo_id: value,
                      }))
                    }
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccione un tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      {tiposVehiculo.map((tipo) => (
                        <SelectItem key={tipo.id} value={tipo.id.toString()}>
                          {tipo.nombre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="color_id">
                    Color <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={vehiculoData.color_id}
                    onValueChange={(value) =>
                      setVehiculoData((prev) => ({
                        ...prev,
                        color_id: value,
                      }))
                    }
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccione un color" />
                    </SelectTrigger>
                    <SelectContent>
                      {colores.map((color) => (
                        <SelectItem key={color.id} value={color.id.toString()}>
                          {color.nombre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Campo para subir imagen del vehículo */}
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="imagen">
                    Foto del Vehículo <span className="text-red-500">*</span>
                  </Label>
                  <div className="space-y-4">
                    {!imagenPreview ? (
                      <div className="border-2 border-dashed border-red-300 rounded-lg p-6 hover:border-blue-500 transition-colors">
                        <input
                          ref={fileInputRef}
                          id="imagen"
                          type="file"
                          accept="image/*"
                          onChange={handleImagenChange}
                          className="hidden"
                        />
                        <label
                          htmlFor="imagen"
                          className="flex flex-col items-center cursor-pointer"
                        >
                          <Upload className="w-12 h-12 text-gray-400 mb-2" />
                          <span className="text-sm text-gray-600 font-medium mb-1">
                            Haga clic para subir una imagen
                          </span>
                          <span className="text-xs text-gray-500">
                            PNG, JPG o JPEG (máx. 5MB)
                          </span>
                        </label>
                      </div>
                    ) : (
                      <div className="relative">
                        <img
                          src={imagenPreview}
                          alt="Preview del vehículo"
                          className="max-h-64 rounded-lg border mx-auto"
                        />
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          onClick={eliminarImagen}
                          className="absolute top-2 right-2"
                        >
                          <X className="w-4 h-4 mr-1" />
                          Eliminar
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-8">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate("/")}
                  disabled={isSubmitting}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                      Registrando...
                    </>
                  ) : (
                    "Registrar Vehículo"
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </form>
      </div>
    </div>
  );
}
