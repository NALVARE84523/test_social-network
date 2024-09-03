import { useState, useEffect } from 'react';
import Gallery from '../components/Gallery';
import UploadForm from '../components/UploadForm';
import useAuth from '../hooks/useAuth';
import { storage } from '../services/firebaseConfig';
import { ref, listAll, getDownloadURL } from 'firebase/storage';

const Home = () => {
    const user = useAuth();
    const [photos, setPhotos] = useState<any[]>([]);

    useEffect(() => {
        const fetchPhotos = async () => {
            const storageRef = ref(storage, 'images/');
            const result = await listAll(storageRef);

            const urlPromises = result.items.map((imageRef) => getDownloadURL(imageRef));
            const urls = await Promise.all(urlPromises);

            setPhotos(urls);
        };

        fetchPhotos();
    }, []);

    return (
        <div>
            <h1>Welcome to Captura y Comparte</h1>
            {user ? (
                <>
                    <UploadForm onUpload={(newPhoto) => setPhotos([newPhoto, ...photos])} />
                    <Gallery photos={photos} />
                </>
            ) : (
                <p>Please log in to upload and view photos.</p>
            )}
        </div>
    );
};

export default Home;
