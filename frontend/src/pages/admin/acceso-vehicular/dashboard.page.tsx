/**
 * Dashboard de Acceso Vehicular
 * Muestra estadísticas y gráficos de entradas/salidas
 */

import React from "react";
import AdminLayout from "@/app/layout/admin-layout";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  BarChart3,
  LogIn,
  LogOut,
  Car,
  Clock,
  RefreshCw,
  Loader2,
  TrendingUp,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend,
} from "recharts";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { useDashboardAcceso } from "@/hooks/useAccesoVehicular";

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884d8", "#82ca9d"];

export default function DashboardAccesoPage() {
  const {
    estadisticas,
    resumenDia,
    loading,
    error,
    periodo,
    cambiarPeriodo,
    recargar,
  } = useDashboardAcceso();

  if (loading) {
    return (
      <AdminLayout>
        <div className="container mx-auto py-6 flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </AdminLayout>
    );
  }

  if (error) {
    return (
      <AdminLayout>
        <div className="container mx-auto py-6">
          <Card>
            <CardContent className="py-8 text-center">
              <p className="text-destructive mb-4">{error}</p>
              <Button onClick={recargar}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Reintentar
              </Button>
            </CardContent>
          </Card>
        </div>
      </AdminLayout>
    );
  }

  // Preparar datos para gráficos
  const datosPorPuerta = estadisticas?.por_puerta.map((p) => ({
    nombre: p.puerta__nombre,
    entradas: p.entradas,
    salidas: p.salidas,
    total: p.total,
  })) || [];

  const datosPorHora = estadisticas?.por_hora.map((h) => ({
    hora: format(new Date(h.hora), "HH:mm"),
    total: h.total,
  })) || [];

  const datosPorTipo = estadisticas?.por_tipo_vehiculo.map((t) => ({
    nombre: t.tipo_vehiculo__nombre,
    total: t.total,
  })) || [];

  const datosPorColor = estadisticas?.por_color.map((c) => ({
    nombre: c.color__nombre,
    total: c.total,
  })) || [];

  return (
    <AdminLayout>
      <div className="container mx-auto py-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <BarChart3 className="h-8 w-8" />
              Dashboard de Acceso Vehicular
            </h1>
            <p className="text-muted-foreground">
              Estadísticas y análisis de flujo vehicular
            </p>
          </div>
          <div className="flex items-center gap-4 mt-4 md:mt-0">
            <Select value={periodo} onValueChange={(v) => cambiarPeriodo(v as "hoy" | "semana" | "mes")}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="hoy">Hoy</SelectItem>
                <SelectItem value="semana">Última semana</SelectItem>
                <SelectItem value="mes">Último mes</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={recargar}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Tarjetas de resumen */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Registros</CardTitle>
              <Car className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{estadisticas?.total_registros || 0}</div>
              <p className="text-xs text-muted-foreground">
                {periodo === "hoy" ? "Hoy" : periodo === "semana" ? "Esta semana" : "Este mes"}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Entradas</CardTitle>
              <LogIn className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {estadisticas?.total_entradas || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                {estadisticas?.total_registros
                  ? `${((estadisticas.total_entradas / estadisticas.total_registros) * 100).toFixed(1)}% del total`
                  : "0%"}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Salidas</CardTitle>
              <LogOut className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {estadisticas?.total_salidas || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                {estadisticas?.total_registros
                  ? `${((estadisticas.total_salidas / estadisticas.total_registros) * 100).toFixed(1)}% del total`
                  : "0%"}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Vehículos Hoy</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{resumenDia?.total || 0}</div>
              <p className="text-xs text-muted-foreground">
                {resumenDia?.entradas || 0} entradas, {resumenDia?.salidas || 0} salidas
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Gráficos */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Gráfico por puerta */}
          <Card>
            <CardHeader>
              <CardTitle>Accesos por Puerta</CardTitle>
              <CardDescription>Distribución de entradas y salidas</CardDescription>
            </CardHeader>
            <CardContent>
              {datosPorPuerta.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={datosPorPuerta}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="nombre" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="entradas" fill="#22c55e" name="Entradas" />
                    <Bar dataKey="salidas" fill="#3b82f6" name="Salidas" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                  No hay datos para mostrar
                </div>
              )}
            </CardContent>
          </Card>

          {/* Gráfico por hora */}
          <Card>
            <CardHeader>
              <CardTitle>Flujo por Hora</CardTitle>
              <CardDescription>Registros a lo largo del día</CardDescription>
            </CardHeader>
            <CardContent>
              {datosPorHora.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={datosPorHora}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="hora" />
                    <YAxis />
                    <Tooltip />
                    <Line
                      type="monotone"
                      dataKey="total"
                      stroke="#8884d8"
                      strokeWidth={2}
                      dot={{ fill: "#8884d8" }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                  No hay datos para mostrar
                </div>
              )}
            </CardContent>
          </Card>

          {/* Gráfico por tipo de vehículo */}
          <Card>
            <CardHeader>
              <CardTitle>Tipos de Vehículo</CardTitle>
              <CardDescription>Distribución por tipo</CardDescription>
            </CardHeader>
            <CardContent>
              {datosPorTipo.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={datosPorTipo}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ nombre, percent }) => `${nombre} (${(percent * 100).toFixed(0)}%)`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="total"
                    >
                      {datosPorTipo.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                  No hay datos para mostrar
                </div>
              )}
            </CardContent>
          </Card>

          {/* Gráfico por color */}
          <Card>
            <CardHeader>
              <CardTitle>Colores de Vehículos</CardTitle>
              <CardDescription>Distribución por color</CardDescription>
            </CardHeader>
            <CardContent>
              {datosPorColor.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={datosPorColor} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis dataKey="nombre" type="category" width={80} />
                    <Tooltip />
                    <Bar dataKey="total" fill="#8884d8">
                      {datosPorColor.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                  No hay datos para mostrar
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Últimos registros */}
        {resumenDia && resumenDia.ultimos_registros.length > 0 && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Últimos Registros de Hoy
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {resumenDia.ultimos_registros.map((registro) => (
                  <div
                    key={registro.id}
                    className="flex items-center justify-between p-3 bg-muted rounded-lg"
                  >
                    <div className="flex items-center gap-4">
                      <Badge variant={registro.tipo_evento === "entrada" ? "default" : "secondary"}>
                        {registro.tipo_evento === "entrada" ? (
                          <LogIn className="h-3 w-3 mr-1" />
                        ) : (
                          <LogOut className="h-3 w-3 mr-1" />
                        )}
                        {registro.tipo_evento}
                      </Badge>
                      <span className="font-mono font-bold">{registro.placa}</span>
                      <span className="text-muted-foreground">{registro.puerta.nombre}</span>
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {format(new Date(registro.fecha_hora), "HH:mm", { locale: es })}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </AdminLayout>
  );
}
