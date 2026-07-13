export interface Producto {
  id?: number;
  nombre: string;
  marca?: string;
  modelo?: string;
  descripcion?: string;
  cantidad?: number;
  precioCompra?: number;
  precioVenta?: number;
  unidad?: string;
  estado?: string;
  categoriaId?: number;
  stockMinimo?: number;
  fechaCreacion?: string;
  fechaActualizacion?: string;
  categoriaNombre?: string;
}
