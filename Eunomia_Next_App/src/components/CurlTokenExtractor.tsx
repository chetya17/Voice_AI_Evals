"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Copy, Check, AlertCircle, Info } from "lucide-react";
import { 
  parseCurlCommand, 
  extractAuthTokenFromCurl, 
  extractHeadersFromCurl,
  extractCookiesFromCurl,
  extractUrlFromCurl,
  isValidCurlCommand,
  formatCurlData,
  CurlParsedData 
} from '@/lib/curlParser';

interface CurlTokenExtractorProps {
  onTokenExtracted: (token: string, headers: Record<string, string>, cookies: Record<string, string>) => void;
  onUrlExtracted?: (url: string) => void;
}

export function CurlTokenExtractor({ onTokenExtracted, onUrlExtracted }: CurlTokenExtractorProps) {
  const [curlCommand, setCurlCommand] = useState('');
  const [parsedData, setParsedData] = useState<CurlParsedData | null>(null);
  const [isValid, setIsValid] = useState<boolean | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleParse = () => {
    setError(null);
    setCopied(false);
    
    if (!curlCommand.trim()) {
      setError('Please enter a curl command');
      setIsValid(false);
      return;
    }

    if (!isValidCurlCommand(curlCommand)) {
      setError('This doesn\'t look like a valid curl command');
      setIsValid(false);
      return;
    }

    const parsed = parseCurlCommand(curlCommand);
    
    if (!parsed) {
      setError('Failed to parse the curl command');
      setIsValid(false);
      return;
    }

    if (!parsed.authorization) {
      setError('No authorization header found in the curl command');
      setIsValid(false);
      return;
    }

    setParsedData(parsed);
    setIsValid(true);
    setError(null);
  };

  const handleUseToken = () => {
    if (parsedData && parsedData.authorization) {
      onTokenExtracted(parsedData.authorization, parsedData.headers, parsedData.cookies);
      if (onUrlExtracted && parsedData.url) {
        onUrlExtracted(parsedData.url);
      }
    }
  };

  const handleCopyToken = async () => {
    if (parsedData?.authorization) {
      try {
        await navigator.clipboard.writeText(parsedData.authorization);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (err) {
        console.error('Failed to copy token:', err);
      }
    }
  };

  const handleClear = () => {
    setCurlCommand('');
    setParsedData(null);
    setIsValid(null);
    setError(null);
    setCopied(false);
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Info className="h-5 w-5 text-blue-600" />
          Curl Command Token Extractor
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <label className="text-sm font-medium mb-2 block">
            Paste your curl command here:
          </label>
          <Textarea
            value={curlCommand}
            onChange={(e) => setCurlCommand(e.target.value)}
            placeholder="curl 'https://example.com/api/endpoint' -H 'authorization: Bearer your-token-here' ..."
            className="min-h-[120px] font-mono text-sm"
          />
        </div>

        <div className="flex gap-2">
          <Button onClick={handleParse} disabled={!curlCommand.trim()}>
            Parse Curl Command
          </Button>
          <Button variant="outline" onClick={handleClear}>
            Clear
          </Button>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {parsedData && isValid && (
          <div className="space-y-4">
            <Alert>
              <Check className="h-4 w-4" />
              <AlertDescription>
                Successfully parsed curl command and found authorization token!
              </AlertDescription>
            </Alert>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="font-medium mb-2">Extracted Information:</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">URL</Badge>
                    <span className="font-mono text-xs break-all">{parsedData.url}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">Method</Badge>
                    <span>{parsedData.method}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">Headers</Badge>
                    <span>{Object.keys(parsedData.headers).length} found</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">Cookies</Badge>
                    <span>{Object.keys(parsedData.cookies).length} found</span>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-medium mb-2">Authorization Token:</h4>
                <div className="bg-muted p-3 rounded-lg">
                  <div className="flex items-center justify-between gap-2">
                    <code className="text-xs break-all flex-1">
                      {parsedData.authorization}
                    </code>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={handleCopyToken}
                      className="h-8 w-8 p-0"
                    >
                      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <Button onClick={handleUseToken} className="flex-1">
                Use This Token
              </Button>
            </div>

            {/* Show additional details in a collapsible section */}
            <details className="mt-4">
              <summary className="cursor-pointer text-sm font-medium text-muted-foreground hover:text-foreground">
                Show Full Parsed Data
              </summary>
              <div className="mt-2 p-3 bg-muted rounded-lg">
                <pre className="text-xs overflow-auto">
                  {formatCurlData(parsedData)}
                </pre>
              </div>
            </details>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default CurlTokenExtractor;
