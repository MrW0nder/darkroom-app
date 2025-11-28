import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter 
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface ExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onExport: (options: ExportOptions) => void;
  fileName: string;
}

interface ExportOptions {
  format: "jpeg" | "png" | "webp";
  quality: number;
  width?: number;
  height?: number;
}

export default function ExportDialog({
  open,
  onOpenChange,
  onExport,
  fileName
}: ExportDialogProps) {
  const [format, setFormat] = useState<"jpeg" | "png" | "webp">("jpeg");
  const [quality, setQuality] = useState<number>(90);
  const [customSize, setCustomSize] = useState<boolean>(false);
  const [width, setWidth] = useState<number>(1920);
  const [height, setHeight] = useState<number>(1080);

  const handleExport = () => {
    const options: ExportOptions = {
      format,
      quality,
      ...(customSize && { width, height })
    };
    onExport(options);
    onOpenChange(false);
  };

  const mimeType = format === "jpeg" ? "image/jpeg" : 
                  format === "png" ? "image/png" : "image/webp";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Export Image</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div>
            <Label>File Name</Label>
            <div className="text-sm text-gray-400 mt-1">{fileName || "edited-image"}</div>
          </div>
          
          <div>
            <Label>Format</Label>
            <Select value={format} onValueChange={(value: "jpeg" | "png" | "webp") => setFormat(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="jpeg">JPEG</SelectItem>
                <SelectItem value="png">PNG</SelectItem>
                <SelectItem value="webp">WebP</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {format !== "png" && (
            <div>
              <Label>Quality: {quality}%</Label>
              <Slider
                min={1}
                max={100}
                step={1}
                value={[quality]}
                onValueChange={(value) => setQuality(value[0])}
              />
              <div className="text-xs text-gray-400 mt-1">
                Higher quality = larger file size
              </div>
            </div>
          )}
          
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="custom-size"
              checked={customSize}
              onChange={(e) => setCustomSize(e.target.checked)}
              className="rounded"
            />
            <Label htmlFor="custom-size">Custom size</Label>
          </div>
          
          {customSize && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Width</Label>
                <input
                  type="number"
                  value={width}
                  onChange={(e) => setWidth(Number(e.target.value))}
                  className="w-full p-2 border rounded bg-gray-800 border-gray-700"
                  min="1"
                />
              </div>
              <div>
                <Label>Height</Label>
                <input
                  type="number"
                  value={height}
                  onChange={(e) => setHeight(Number(e.target.value))}
                  className="w-full p-2 border rounded bg-gray-800 border-gray-700"
                  min="1"
                />
              </div>
            </div>
          )}
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleExport}>
            Export
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}