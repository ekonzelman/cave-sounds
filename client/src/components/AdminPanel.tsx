import React, { useState, useRef } from 'react';
import { useMusicExplorer } from '../lib/stores/useMusicExplorer';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';

export default function AdminPanel() {
  const { toggleAdmin, uploadAudioFile, songNodes, deleteSongNode } = useMusicExplorer();
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = ['audio/wav', 'audio/mpeg', 'audio/mp3'];
    if (!validTypes.includes(file.type)) {
      setUploadStatus('Please select a valid audio file (.wav or .mp3)');
      return;
    }

    // Validate file size (max 50MB)
    const maxSize = 50 * 1024 * 1024;
    if (file.size > maxSize) {
      setUploadStatus('File too large. Maximum size is 50MB.');
      return;
    }

    setUploading(true);
    setUploadStatus('Uploading...');

    try {
      await uploadAudioFile(file);
      setUploadStatus('File uploaded successfully!');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      console.error('Upload error:', error);
      setUploadStatus('Upload failed. Please try again.');
    } finally {
      setUploading(false);
      setTimeout(() => setUploadStatus(''), 3000);
    }
  };

  const handleDeleteSong = async (songId: string) => {
    if (window.confirm('Are you sure you want to delete this song?')) {
      try {
        await deleteSongNode(songId);
      } catch (error) {
        console.error('Delete error:', error);
      }
    }
  };

  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      background: 'linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px'
    }}>
      <Card style={{ 
        width: '100%', 
        maxWidth: '800px', 
        maxHeight: '90vh', 
        overflow: 'auto',
        background: 'rgba(255, 255, 255, 0.95)'
      }}>
        <CardHeader>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <CardTitle style={{ fontSize: '24px', color: '#2a5298' }}>
              🎵 Cave Music Explorer - Admin Panel
            </CardTitle>
            <Button 
              onClick={toggleAdmin}
              variant="outline"
              style={{ background: 'white' }}
            >
              Back to Cave
            </Button>
          </div>
        </CardHeader>
        
        <CardContent style={{ padding: '20px' }}>
          {/* File Upload Section */}
          <div style={{ marginBottom: '30px' }}>
            <h3 style={{ fontSize: '18px', marginBottom: '15px', color: '#333' }}>
              Upload New Song
            </h3>
            
            <div style={{ marginBottom: '15px' }}>
              <Label htmlFor="audio-file" style={{ fontSize: '14px', color: '#555' }}>
                Select Audio File (.wav or .mp3)
              </Label>
              <Input
                ref={fileInputRef}
                id="audio-file"
                type="file"
                accept=".wav,.mp3,audio/wav,audio/mpeg"
                onChange={handleFileUpload}
                disabled={uploading}
                style={{ marginTop: '5px' }}
              />
            </div>

            {uploadStatus && (
              <div style={{
                padding: '10px',
                borderRadius: '4px',
                fontSize: '14px',
                background: uploadStatus.includes('success') 
                  ? 'rgba(76, 175, 80, 0.1)' 
                  : uploadStatus.includes('failed') || uploadStatus.includes('Please') || uploadStatus.includes('too large')
                  ? 'rgba(244, 67, 54, 0.1)'
                  : 'rgba(33, 150, 243, 0.1)',
                color: uploadStatus.includes('success') 
                  ? '#4caf50' 
                  : uploadStatus.includes('failed') || uploadStatus.includes('Please') || uploadStatus.includes('too large')
                  ? '#f44336'
                  : '#2196f3',
                border: `1px solid ${uploadStatus.includes('success') 
                  ? '#4caf50' 
                  : uploadStatus.includes('failed') || uploadStatus.includes('Please') || uploadStatus.includes('too large')
                  ? '#f44336'
                  : '#2196f3'}`
              }}>
                {uploadStatus}
              </div>
            )}

            <div style={{ 
              fontSize: '12px', 
              color: '#666', 
              marginTop: '10px',
              lineHeight: '1.4'
            }}>
              <strong>Instructions:</strong>
              <ul style={{ marginTop: '5px', marginLeft: '20px' }}>
                <li>Supported formats: WAV, MP3</li>
                <li>Maximum file size: 50MB</li>
                <li>Songs will be automatically placed in the cave</li>
                <li>Players can discover and play uploaded songs</li>
              </ul>
            </div>
          </div>

          {/* Song Management Section */}
          <div>
            <h3 style={{ fontSize: '18px', marginBottom: '15px', color: '#333' }}>
              Manage Songs ({songNodes.length} total)
            </h3>
            
            {songNodes.length === 0 ? (
              <div style={{
                padding: '40px',
                textAlign: 'center',
                color: '#666',
                background: 'rgba(0, 0, 0, 0.05)',
                borderRadius: '8px'
              }}>
                No songs uploaded yet. Upload your first song above!
              </div>
            ) : (
              <div style={{ display: 'grid', gap: '15px' }}>
                {songNodes.map((song) => (
                  <div
                    key={song.id}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '15px',
                      background: 'rgba(0, 0, 0, 0.05)',
                      borderRadius: '8px',
                      border: '1px solid rgba(0, 0, 0, 0.1)'
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <div style={{ 
                        fontSize: '16px', 
                        fontWeight: 'bold', 
                        color: '#333',
                        marginBottom: '5px'
                      }}>
                        {song.title}
                      </div>
                      <div style={{ 
                        fontSize: '12px', 
                        color: '#666',
                        marginBottom: '5px'
                      }}>
                        File: {song.filename}
                      </div>
                      <div style={{ 
                        fontSize: '12px', 
                        color: song.discovered ? '#4caf50' : '#ff9800'
                      }}>
                        Status: {song.discovered ? 'Discovered by players' : 'Not yet discovered'}
                      </div>
                      <div style={{ 
                        fontSize: '12px', 
                        color: '#666'
                      }}>
                        Position: ({song.position[0].toFixed(1)}, {song.position[1].toFixed(1)}, {song.position[2].toFixed(1)})
                      </div>
                    </div>
                    
                    <Button
                      onClick={() => handleDeleteSong(song.id)}
                      variant="destructive"
                      size="sm"
                      style={{ marginLeft: '15px' }}
                    >
                      Delete
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Usage Statistics */}
          <div style={{ 
            marginTop: '30px', 
            padding: '15px', 
            background: 'rgba(33, 150, 243, 0.1)',
            borderRadius: '8px',
            border: '1px solid rgba(33, 150, 243, 0.2)'
          }}>
            <h4 style={{ margin: '0 0 10px 0', color: '#1976d2' }}>
              📊 Statistics
            </h4>
            <div style={{ fontSize: '14px', color: '#333' }}>
              <div>Total songs: {songNodes.length}</div>
              <div>Discovered songs: {songNodes.filter(s => s.discovered).length}</div>
              <div>Hidden songs: {songNodes.filter(s => !s.discovered).length}</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
