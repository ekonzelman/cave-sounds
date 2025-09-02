import React, { useState, useRef, useEffect } from 'react';
import { useMusicExplorer } from '../lib/stores/useMusicExplorer';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Slider } from './ui/slider';
import type { CaveObjectNode } from '../../../shared/schema';

export default function AdminPanel() {
  const { toggleAdmin, uploadAudioFile, songNodes, deleteSongNode, refreshSongs } = useMusicExplorer();
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string>('');
  const [caveObjects, setCaveObjects] = useState<CaveObjectNode[]>([]);
  const [selectedSong, setSelectedSong] = useState<string | null>(null);
  const [songCustomization, setSongCustomization] = useState({
    nodeShape: 'sphere',
    nodeSize: 1.0,
    nodeColor: '#ff00ff',
    glowIntensity: 1.0,
    animationStyle: 'pulse'
  });
  const [newCaveObject, setNewCaveObject] = useState({
    objectType: 'stalactite',
    positionX: 0,
    positionY: -3,  // Much lower Y position to be visible from player level
    positionZ: 5,   // A bit forward from origin
    scaleX: 2.0,    // Make objects larger so they're more visible
    scaleY: 2.0,
    scaleZ: 2.0,
    color: '#ff0000',  // Bright red for high visibility
    opacity: 1.0,   // Full opacity
    rotationX: 0,
    rotationY: 0,
    rotationZ: 0
  });
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

  // Load cave objects on component mount
  useEffect(() => {
    fetchCaveObjects();
  }, []);

  const fetchCaveObjects = async () => {
    try {
      const response = await fetch('/api/cave-objects');
      if (response.ok) {
        const objects = await response.json();
        setCaveObjects(objects);
      }
    } catch (error) {
      console.error('Error fetching cave objects:', error);
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

  const handleUpdateSongCustomization = async () => {
    if (!selectedSong) return;
    
    try {
      const response = await fetch(`/api/songs/${selectedSong}/customization`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(songCustomization)
      });
      
      if (response.ok) {
        // Refresh song data to show updated customization
        refreshSongs();
        setUploadStatus('Song customization updated successfully!');
        setTimeout(() => setUploadStatus(''), 3000);
      }
    } catch (error) {
      console.error('Error updating song customization:', error);
      setUploadStatus('Failed to update song customization');
    }
  };

  const handleCreateCaveObject = async () => {
    try {
      const response = await fetch('/api/cave-objects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newCaveObject)
      });
      
      if (response.ok) {
        await fetchCaveObjects();
        setUploadStatus('Cave object created successfully!');
        setTimeout(() => setUploadStatus(''), 3000);
        // Reset form
        setNewCaveObject({
          objectType: 'stalactite',
          positionX: 0,
          positionY: -3,
          positionZ: 5,
          scaleX: 2.0,
          scaleY: 2.0,
          scaleZ: 2.0,
          color: '#ff0000',
          opacity: 1.0,
          rotationX: 0,
          rotationY: 0,
          rotationZ: 0
        });
      }
    } catch (error) {
      console.error('Error creating cave object:', error);
      setUploadStatus('Failed to create cave object');
    }
  };

  const handleDeleteCaveObject = async (objectId: string) => {
    if (window.confirm('Are you sure you want to delete this cave object?')) {
      try {
        const response = await fetch(`/api/cave-objects/${objectId}`, {
          method: 'DELETE'
        });
        
        if (response.ok) {
          await fetchCaveObjects();
          setUploadStatus('Cave object deleted successfully!');
          setTimeout(() => setUploadStatus(''), 3000);
        }
      } catch (error) {
        console.error('Error deleting cave object:', error);
        setUploadStatus('Failed to delete cave object');
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
          <Tabs defaultValue="songs" style={{ width: '100%' }}>
            <TabsList style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
              <TabsTrigger value="songs">Songs Management</TabsTrigger>
              <TabsTrigger value="cave-objects">Cave Objects</TabsTrigger>
              <TabsTrigger value="customization">Song Customization</TabsTrigger>
            </TabsList>
            
            <TabsContent value="songs" style={{ marginTop: '20px' }}>
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
                        Position: ({
                          song.position && song.position[0] !== null ? song.position[0].toFixed(1) : '0.0'
                        }, {
                          song.position && song.position[1] !== null ? song.position[1].toFixed(1) : '0.0'
                        }, {
                          song.position && song.position[2] !== null ? song.position[2].toFixed(1) : '0.0'
                        })
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
            </TabsContent>

            <TabsContent value="cave-objects" style={{ marginTop: '20px' }}>
              <h3 style={{ fontSize: '18px', marginBottom: '15px', color: '#333' }}>
                Create New Cave Object
              </h3>
              
              <div style={{ display: 'grid', gap: '15px', marginBottom: '20px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                  <div>
                    <Label htmlFor="objectType">Object Type</Label>
                    <Select 
                      value={newCaveObject.objectType} 
                      onValueChange={(value) => setNewCaveObject(prev => ({ ...prev, objectType: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="stalactite">Stalactite</SelectItem>
                        <SelectItem value="stalagmite">Stalagmite</SelectItem>
                        <SelectItem value="crystal">Crystal</SelectItem>
                        <SelectItem value="flowstone">Flowstone</SelectItem>
                        <SelectItem value="particle_system">Particle System</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="color">Color</Label>
                    <Input
                      type="color"
                      value={newCaveObject.color}
                      onChange={(e) => setNewCaveObject(prev => ({ ...prev, color: e.target.value }))}
                    />
                  </div>
                </div>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '15px' }}>
                  <div>
                    <Label>Position X: {newCaveObject.positionX}</Label>
                    <Slider
                      value={[newCaveObject.positionX]}
                      onValueChange={(value) => setNewCaveObject(prev => ({ ...prev, positionX: value[0] }))}
                      max={50}
                      min={-50}
                      step={0.1}
                    />
                  </div>
                  <div>
                    <Label>Position Y: {newCaveObject.positionY}</Label>
                    <Slider
                      value={[newCaveObject.positionY]}
                      onValueChange={(value) => setNewCaveObject(prev => ({ ...prev, positionY: value[0] }))}
                      max={10}
                      min={-10}
                      step={0.1}
                    />
                  </div>
                  <div>
                    <Label>Position Z: {newCaveObject.positionZ}</Label>
                    <Slider
                      value={[newCaveObject.positionZ]}
                      onValueChange={(value) => setNewCaveObject(prev => ({ ...prev, positionZ: value[0] }))}
                      max={50}
                      min={-50}
                      step={0.1}
                    />
                  </div>
                </div>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '15px' }}>
                  <div>
                    <Label>Scale X: {newCaveObject.scaleX}</Label>
                    <Slider
                      value={[newCaveObject.scaleX]}
                      onValueChange={(value) => setNewCaveObject(prev => ({ ...prev, scaleX: value[0] }))}
                      max={5}
                      min={0.1}
                      step={0.1}
                    />
                  </div>
                  <div>
                    <Label>Scale Y: {newCaveObject.scaleY}</Label>
                    <Slider
                      value={[newCaveObject.scaleY]}
                      onValueChange={(value) => setNewCaveObject(prev => ({ ...prev, scaleY: value[0] }))}
                      max={5}
                      min={0.1}
                      step={0.1}
                    />
                  </div>
                  <div>
                    <Label>Scale Z: {newCaveObject.scaleZ}</Label>
                    <Slider
                      value={[newCaveObject.scaleZ]}
                      onValueChange={(value) => setNewCaveObject(prev => ({ ...prev, scaleZ: value[0] }))}
                      max={5}
                      min={0.1}
                      step={0.1}
                    />
                  </div>
                </div>
                
                <Button onClick={handleCreateCaveObject} style={{ marginTop: '10px' }}>
                  Create Cave Object
                </Button>
              </div>

              <h3 style={{ fontSize: '18px', marginBottom: '15px', color: '#333' }}>
                Existing Cave Objects ({caveObjects.length} total)
              </h3>
              
              <div style={{ display: 'grid', gap: '15px' }}>
                {caveObjects.map((obj) => (
                  <div
                    key={obj.id}
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
                      <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#333' }}>
                        {obj.objectType}
                      </div>
                      <div style={{ fontSize: '12px', color: '#666' }}>
                        Position: ({obj.position[0].toFixed(1)}, {obj.position[1].toFixed(1)}, {obj.position[2].toFixed(1)})
                      </div>
                      <div style={{ fontSize: '12px', color: '#666' }}>
                        Scale: ({obj.scale[0].toFixed(1)}, {obj.scale[1].toFixed(1)}, {obj.scale[2].toFixed(1)})
                      </div>
                      <div style={{ fontSize: '12px', color: '#666' }}>
                        Color: {obj.color}
                      </div>
                    </div>
                    
                    <Button
                      onClick={() => handleDeleteCaveObject(obj.id)}
                      variant="destructive"
                      size="sm"
                    >
                      Delete
                    </Button>
                  </div>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="customization" style={{ marginTop: '20px' }}>
              <h3 style={{ fontSize: '18px', marginBottom: '15px', color: '#333' }}>
                Customize Song Nodes
              </h3>
              
              <div style={{ marginBottom: '20px' }}>
                <Label htmlFor="song-select">Select Song to Customize</Label>
                <Select value={selectedSong || ''} onValueChange={setSelectedSong}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a song..." />
                  </SelectTrigger>
                  <SelectContent>
                    {songNodes.map((song) => (
                      <SelectItem key={song.id} value={song.id}>
                        {song.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedSong && (
                <div style={{ display: 'grid', gap: '15px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                    <div>
                      <Label>Node Shape</Label>
                      <Select 
                        value={songCustomization.nodeShape} 
                        onValueChange={(value) => setSongCustomization(prev => ({ ...prev, nodeShape: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="sphere">Sphere</SelectItem>
                          <SelectItem value="cube">Cube</SelectItem>
                          <SelectItem value="cylinder">Cylinder</SelectItem>
                          <SelectItem value="dodecahedron">Dodecahedron</SelectItem>
                          <SelectItem value="octahedron">Octahedron</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Animation Style</Label>
                      <Select 
                        value={songCustomization.animationStyle} 
                        onValueChange={(value) => setSongCustomization(prev => ({ ...prev, animationStyle: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pulse">Pulse</SelectItem>
                          <SelectItem value="rotate">Rotate</SelectItem>
                          <SelectItem value="float">Float</SelectItem>
                          <SelectItem value="spiral">Spiral</SelectItem>
                          <SelectItem value="bounce">Bounce</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <div>
                    <Label>Node Color</Label>
                    <Input
                      type="color"
                      value={songCustomization.nodeColor}
                      onChange={(e) => setSongCustomization(prev => ({ ...prev, nodeColor: e.target.value }))}
                    />
                  </div>
                  
                  <div>
                    <Label>Node Size: {songCustomization.nodeSize}</Label>
                    <Slider
                      value={[songCustomization.nodeSize]}
                      onValueChange={(value) => setSongCustomization(prev => ({ ...prev, nodeSize: value[0] }))}
                      max={3}
                      min={0.1}
                      step={0.1}
                    />
                  </div>
                  
                  <div>
                    <Label>Glow Intensity: {songCustomization.glowIntensity}</Label>
                    <Slider
                      value={[songCustomization.glowIntensity]}
                      onValueChange={(value) => setSongCustomization(prev => ({ ...prev, glowIntensity: value[0] }))}
                      max={3}
                      min={0}
                      step={0.1}
                    />
                  </div>
                  
                  <Button onClick={handleUpdateSongCustomization} style={{ marginTop: '10px' }}>
                    Update Song Customization
                  </Button>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
