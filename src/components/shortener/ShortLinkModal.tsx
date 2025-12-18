import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Copy, Download, X, ExternalLink, ChevronDown } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import QRCode from 'qrcode';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import jsPDF from 'jspdf';

interface ShortLinkModalProps {
  isOpen: boolean;
  onClose: () => void;
  shortUrl: string;
  originalUrl: string;
  linkId: string;
  createdAt?: string;
}
 
const ShortLinkModal = ({ 
  isOpen, 
  onClose, 
  shortUrl, 
  originalUrl, 
  linkId,
  createdAt
}: ShortLinkModalProps) => {
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  const [isGeneratingQR, setIsGeneratingQR] = useState(false);
  const [downloadFormat, setDownloadFormat] = useState('PNG');
  const { toast } = useToast();

  // Generate QR code
  useEffect(() => {
    if (isOpen && shortUrl) {
      setIsGeneratingQR(true);
      QRCode.toDataURL(shortUrl, {
        width: 200,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      })
      .then((dataUrl) => {
        setQrCodeDataUrl(dataUrl);
        setIsGeneratingQR(false);
      })
      .catch((err) => {
        console.error('Error generating QR code:', err);
        setIsGeneratingQR(false);
      });
    }
  }, [isOpen, shortUrl]);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(shortUrl);
    toast({
      title: "Copied!",
      description: "Short link copied to clipboard",
    });
  };

  const downloadQRCode = async () => {
    if (!qrCodeDataUrl) return;
    
    try {
      let dataUrl = qrCodeDataUrl;
      let filename = `qr-code-${shortUrl.split('/').pop()}`;
      
      if (downloadFormat === 'SVG') {
        // Generate SVG QR code
        const svgString = await QRCode.toString(shortUrl, { type: 'svg' });
        dataUrl = `data:image/svg+xml;base64,${btoa(svgString)}`;
        filename += '.svg';
      } else if (downloadFormat === 'PDF') {
        // Generate PDF with QR code
        const pdf = new jsPDF();
        const img = new Image();
        
        return new Promise((resolve) => {
          img.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            canvas.width = img.width;
            canvas.height = img.height;
            ctx?.drawImage(img, 0, 0);
            
            const imgData = canvas.toDataURL('image/png');
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = pdf.internal.pageSize.getHeight();
            const imgWidth = 100;
            const imgHeight = 100;
            const x = (pdfWidth - imgWidth) / 2;
            const y = (pdfHeight - imgHeight) / 2;
            
            pdf.addImage(imgData, 'PNG', x, y, imgWidth, imgHeight);
            pdf.text(`QR Code for: ${shortUrl}`, 20, y + imgHeight + 20);
            pdf.save(filename + '.pdf');
            resolve(true);
          };
          img.src = qrCodeDataUrl;
        });
      } else {
        // PNG format
        filename += '.png';
      }
      
      const link = document.createElement('a');
      link.download = filename;
      link.href = dataUrl;
      link.click();
      
      toast({
        title: "Downloaded!",
        description: `QR code downloaded as ${downloadFormat}`,
      });
    } catch (error) {
      console.error('Error downloading QR code:', error);
      toast({
        title: "Error",
        description: "Failed to download QR code",
        variant: "destructive",
      });
    }
  };


  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl bg-card border-card-border">
        <DialogHeader className="flex flex-row items-center justify-between">
          <div>
            <DialogTitle className="text-2xl font-bold text-card-foreground">
              Short Link
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Your link has been shortened successfully
            </DialogDescription>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-8 w-8 p-0 hover:bg-surface-secondary"
          >
            <X className="h-4 w-4" />
          </Button>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 py-6">
          {/* QR Code Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-center">
              {isGeneratingQR ? (
                <div className="w-48 h-48 bg-surface-secondary rounded-lg flex items-center justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : (
                <div className="w-48 h-48 bg-white rounded-lg p-4 shadow-lg">
                  <img 
                    src={qrCodeDataUrl} 
                    alt="QR Code" 
                    className="w-full h-full object-contain"
                  />
                </div>
              )}
            </div>
            
            <div className="flex items-center space-x-2">
              <Button
                onClick={downloadQRCode}
                disabled={!qrCodeDataUrl}
                className="flex-1 bg-primary hover:bg-primary-dark"
              >
                <Download className="w-4 h-4 mr-2" />
                Download
              </Button>
              <Select value={downloadFormat} onValueChange={setDownloadFormat}>
                <SelectTrigger className="w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PNG">PNG</SelectItem>
                  <SelectItem value="SVG">SVG</SelectItem>
                  <SelectItem value="PDF">PDF</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Short Link Section */}
          <div className="space-y-6">
            <div>
              <label className="text-sm font-medium text-card-foreground mb-2 block">
                Short Link
              </label>
              <div className="flex items-center space-x-2">
                <Input
                  value={shortUrl}
                  readOnly
                  className="flex-1 bg-surface-secondary border-card-border"
                />
                <Button
                  onClick={copyToClipboard}
                  className="bg-primary hover:bg-primary-dark"
                >
                  <Copy className="w-4 h-4 mr-2" />
                  Copy
                </Button>
              </div>
            </div>


            {/* Original URL */}
            <div>
              <label className="text-sm font-medium text-card-foreground mb-2 block">
                Original URL
              </label>
              <div className="flex items-center space-x-2">
                <Input
                  value={originalUrl}
                  readOnly
                  className="flex-1 bg-surface-secondary border-card-border text-sm"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(originalUrl, '_blank')}
                >
                  <ExternalLink className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Created Date */}
            {createdAt && (
              <div className="text-sm text-muted-foreground">
                Created: {formatDate(createdAt)}
              </div>
            )}

          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ShortLinkModal;
