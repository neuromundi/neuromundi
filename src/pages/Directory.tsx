/**
 * Directory — directorio público. Monta DirectorySearch y navega al perfil del
 * proveedor seleccionado.
 */
import { useNavigate } from 'react-router-dom';
import { DirectorySearch } from '@/components/directory';

export function Directory() {
  const navigate = useNavigate();
  return <DirectorySearch onViewProfile={(id) => navigate(`/proveedor/${id}`)} />;
}
