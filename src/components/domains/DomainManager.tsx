import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useDomains } from '@/hooks/useDomains';
import { Plus, Globe, Check, X, Star, Trash2, ExternalLink, Copy } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const DomainManager = () => {
  const [newDomain, setNewDomain] = useState('');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const { domains, loading, addDomain, verifyDomain, setDefaultDomain, deleteDomain } = useDomains();
  const { toast } = useToast();

  const handleAddDomain = async () => {
    if (!newDomain.trim()) return;

    try {
      await addDomain(newDomain);
      setNewDomain('');
      setIsAddDialogOpen(false);
    } catch (error) {
      // Error handling is done in the hook
    }
  };

  const copyVerificationCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast({
      title: "Copied!",
      description: "Verification code copied to clipboard",
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Domain Management</h2>
          <p className="text-muted-foreground">Manage your custom domains for shortened links</p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Add Domain
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Domain</DialogTitle>
              <DialogDescription>
                Add a custom domain for your shortened links
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="domain">Domain</Label>
                <Input
                  id="domain"
                  placeholder="example.com"
                  value={newDomain}
                  onChange={(e) => setNewDomain(e.target.value)}
                />
              </div>
              <Alert>
                <AlertDescription>
                  You'll need to add a DNS record to verify ownership of this domain.
                </AlertDescription>
              </Alert>
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleAddDomain} disabled={!newDomain.trim()}>
                  Add Domain
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {domains.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-8">
              <Globe className="w-12 h-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No domains yet</h3>
              <p className="text-muted-foreground text-center mb-4">
                Add your first custom domain to start creating branded short links
              </p>
              <Button onClick={() => setIsAddDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Add Your First Domain
              </Button>
            </CardContent>
          </Card>
        ) : (
          domains.map((domain) => (
            <Card key={domain.id}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                      <Globe className="w-5 h-5 text-primary" />
                      <span className="font-semibold">{domain.domain}</span>
                      {domain.is_default && (
                        <Badge variant="secondary" className="flex items-center space-x-1">
                          <Star className="w-3 h-3" />
                          <span>Default</span>
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center space-x-2">
                      {domain.verified ? (
                        <Badge variant="default" className="bg-green-100 text-green-800">
                          <Check className="w-3 h-3 mr-1" />
                          Verified
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                          <X className="w-3 h-3 mr-1" />
                          Pending
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {!domain.verified && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => verifyDomain(domain.id)}
                      >
                        Verify
                      </Button>
                    )}
                    {!domain.is_default && domain.verified && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setDefaultDomain(domain.id)}
                      >
                        Set Default
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => deleteDomain(domain.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                
                {!domain.verified && (
                  <div className="mt-4 p-4 bg-muted rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">DNS Verification Required</p>
                        <p className="text-sm text-muted-foreground">
                          Add this TXT record to your DNS settings:
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyVerificationCode(domain.dns_verification_code)}
                      >
                        <Copy className="w-4 h-4 mr-1" />
                        Copy
                      </Button>
                    </div>
                    <div className="mt-2 p-2 bg-background rounded border font-mono text-sm">
                      {domain.dns_verification_code}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

export default DomainManager;
