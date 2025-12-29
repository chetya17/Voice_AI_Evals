import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Settings, ArrowUpDown, FileText, Image, File } from 'lucide-react';

interface CustomerData {
  id: string;
  fileName: string;
  fileType: 'jpg' | 'docx' | 'pdf';
  fileSize: string;
  teamMembers: number;
  additionalMembers: number;
  industry: string;
  status: 'completed' | 'funding' | 'cancelled';
  rating: number;
  selected?: boolean;
}

interface PremiumTableProps {
  title: string;
  data: CustomerData[];
  onSelectionChange?: (selectedIds: string[]) => void;
  onSort?: (column: string) => void;
}

const PremiumTable: React.FC<PremiumTableProps> = ({
  title,
  data,
  onSelectionChange,
  onSort
}) => {
  const getFileIcon = (fileType: string) => {
    switch (fileType) {
      case 'jpg':
        return <Image className="w-4 h-4 text-blue-500" />;
      case 'docx':
        return <FileText className="w-4 h-4 text-green-500" />;
      case 'pdf':
        return <File className="w-4 h-4 text-red-500" />;
      default:
        return <File className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="badge-success">Completed</Badge>;
      case 'funding':
        return <Badge className="badge-warning">Funding</Badge>;
      case 'cancelled':
        return <Badge className="badge-cancelled">Cancelled</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getRatingStars = (rating: number) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 !== 0;

    for (let i = 0; i < fullStars; i++) {
      stars.push(
        <svg key={i} className="w-4 h-4 text-yellow-400 fill-current" viewBox="0 0 20 20">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      );
    }

    if (hasHalfStar) {
      stars.push(
        <svg key="half" className="w-4 h-4 text-yellow-400 fill-current" viewBox="0 0 20 20">
          <defs>
            <linearGradient id="halfStar">
              <stop offset="50%" stopColor="currentColor" />
              <stop offset="50%" stopColor="transparent" />
            </linearGradient>
          </defs>
          <path fill="url(#halfStar)" d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      );
    }

    const emptyStars = 5 - Math.ceil(rating);
    for (let i = 0; i < emptyStars; i++) {
      stars.push(
        <svg key={`empty-${i}`} className="w-4 h-4 text-gray-300" viewBox="0 0 20 20">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      );
    }

    return stars;
  };

  return (
    <Card className="premium-table">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold">{title}</CardTitle>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="gap-2">
              <span className="text-sm">+ New</span>
            </Button>
            <Button variant="ghost" size="sm" className="p-2">
              <Settings className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border/30">
                <th className="px-6 py-4 text-left">
                  <Checkbox />
                </th>
                <th className="px-6 py-4 text-left">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">FullName</span>
                    <Button variant="ghost" size="sm" className="p-1 h-6 w-6" onClick={() => onSort?.('name')}>
                      <ArrowUpDown className="w-3 h-3" />
                    </Button>
                  </div>
                </th>
                <th className="px-6 py-4 text-left">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">Industry</span>
                    <Button variant="ghost" size="sm" className="p-1 h-6 w-6" onClick={() => onSort?.('industry')}>
                      <ArrowUpDown className="w-3 h-3" />
                    </Button>
                  </div>
                </th>
                <th className="px-6 py-4 text-left">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">Status</span>
                    <Button variant="ghost" size="sm" className="p-1 h-6 w-6" onClick={() => onSort?.('status')}>
                      <ArrowUpDown className="w-3 h-3" />
                    </Button>
                  </div>
                </th>
                <th className="px-6 py-4 text-left">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">Rating</span>
                    <Button variant="ghost" size="sm" className="p-1 h-6 w-6" onClick={() => onSort?.('rating')}>
                      <ArrowUpDown className="w-3 h-3" />
                    </Button>
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              {data.map((item) => (
                <tr key={item.id} className="border-b border-border/30 hover:bg-muted/30 transition-colors">
                  <td className="px-6 py-4">
                    <Checkbox 
                      checked={item.selected}
                      onCheckedChange={(checked) => {
                        // Handle selection change
                      }}
                    />
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      {getFileIcon(item.fileType)}
                      <div>
                        <p className="font-medium text-sm">{item.fileName}</p>
                        <p className="text-xs text-muted-foreground">{item.fileSize} total</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className="flex -space-x-2">
                        {Array.from({ length: Math.min(item.teamMembers, 5) }).map((_, i) => (
                          <div key={i} className="w-6 h-6 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full border-2 border-white"></div>
                        ))}
                      </div>
                      {item.additionalMembers > 0 && (
                        <span className="text-xs text-muted-foreground">+{item.additionalMembers}</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {getStatusBadge(item.status)}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1">
                      {getRatingStars(item.rating)}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
};

export default PremiumTable;
