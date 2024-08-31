import React, { useState, useRef } from 'react';
import { storage, db } from '../services/firebaseConfig';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { addDoc, collection } from 'firebase/firestore';

interface UploadFormProps {
    onUpload: (newPhoto: any) => void;
}

const UploadForm: React.FC<UploadFormProps> = ({ onUpload }) => {
    const [file, setFile] = useState<File | null>(null);
    const [progress, setProgress] = useState(0);
    const videoRef = useRef<HTMLVideoElement>(null);
    const [isCameraActive, setIsCameraActive] = useState(false);

    const handleUpload = () => {
        if (!file) return;

        const timestamp = Date.now();
        const storageRef = ref(storage, `images/${timestamp}_${file.name}`);
        const uploadTask = uploadBytesResumable(storageRef, file);

        uploadTask.on(
            "state_changed",
            (snapshot) => {
                const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                setProgress(progress);
            },
            (error) => {
                console.error("Upload error", error);
            },
            async () => {
                const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
                onUpload(downloadURL);  // Pasar la URL de la imagen al componente principal
            }
        );
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            setFile(e.target.files[0]);
        }
    };

    const handleTakePhoto = () => {
        if (videoRef.current) {
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            canvas.width = videoRef.current.videoWidth;
            canvas.height = videoRef.current.videoHeight;
            context?.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
            canvas.toBlob((blob) => {
                if (blob) {
                    const file = new File([blob], 'photo.png', { type: 'image/png' });
                    setFile(file);
                }
            });
        }
    };

    const startCamera = async () => {
        setIsCameraActive(true);
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        if (videoRef.current) {
            videoRef.current.srcObject = stream;
        }
    };

    const stopCamera = () => {
        setIsCameraActive(false);
        if (videoRef.current?.srcObject) {
            const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
            tracks.forEach(track => track.stop());
            videoRef.current.srcObject = null;
        }
    };

    return (
        <div>
            <input type="file" onChange={handleFileChange} />
            <button onClick={handleUpload}>Upload</button>
            {progress > 0 && <p>Upload Progress: {progress}%</p>}
            <div>
                {isCameraActive ? (
                    <>
                        <video ref={videoRef} autoPlay />
                        <button onClick={handleTakePhoto}>Take Photo</button>
                        <button onClick={stopCamera}>Stop Camera</button>
                    </>
                ) : (
                    <button onClick={startCamera}>Take Photo with Camera</button>
                )}
            </div>
        </div>
    );
};

export default UploadForm;
