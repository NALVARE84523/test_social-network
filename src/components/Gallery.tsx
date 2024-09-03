import React, { useState, useEffect } from 'react';
import { storage } from '../services/firebaseConfig';
import { ref, getBytes, uploadString, listAll, StorageReference, getMetadata } from 'firebase/storage';

interface GalleryProps {
    photos: string[];
}

const Gallery: React.FC<GalleryProps> = ({ photos }) => {
    const [likes, setLikes] = useState<{ [key: string]: number }>({});
    const [dislikes, setDislikes] = useState<{ [key: string]: number }>({});
    const [userInteractions, setUserInteractions] = useState<{ [key: string]: 'likes' | 'dislikes' | null }>({});

    useEffect(() => {
        photos.forEach(async (url) => {
            const fileName = getFileNameFromUrl(url);
    
            // Crear archivos de contadores para la nueva imagen
            await createEmptyFileIfNotExists(fileName, 'likes');
            await createEmptyFileIfNotExists(fileName, 'dislikes');
    
            // Leer los contadores
            const likeCount = await fetchCount(url, 'likes');
            const dislikeCount = await fetchCount(url, 'dislikes');
    
            setLikes((prev) => ({ ...prev, [url]: likeCount }));
            setDislikes((prev) => ({ ...prev, [url]: dislikeCount }));
    
            const interaction = await fetchUserInteraction(fileName);
            setUserInteractions((prev) => ({
                ...prev,
                [url]: interaction,
            }));
        });
    }, [photos]);

    const createEmptyFileIfNotExists = async (fileName: string, type: 'likes' | 'dislikes') => {
        const countRef = ref(storage, `counts/${fileName}_${type}.txt`);
        try {
            await getMetadata(countRef);
            console.log(`Archivo ${type} ya existe para ${fileName}.`);
        } catch (error) {
            if (error instanceof Error && 'code' in error && (error as { code: string }).code === 'storage/object-not-found') {
                console.log(`Archivo ${type} no encontrado para ${fileName}. Creando con valor 0.`);
                await uploadString(countRef, '0');
            } else {
                console.error(`Error asegurando existencia de archivo ${type} para ${fileName}:`, error);
            }
        }
    };

    const fetchCount = async (url: string, type: 'likes' | 'dislikes') => {
        const fileName = getFileNameFromUrl(url);
        const countRef = ref(storage, `counts/${fileName}_${type}.txt`);
        try {
            const bytes = await getBytes(countRef);
            const count = parseInt(new TextDecoder().decode(bytes), 10);
            return isNaN(count) ? 0 : count;
        } catch (error) {
            console.error(`Failed to fetch ${type} count for ${url}:`, error);
            return 0;
        }
    };

    const fetchUserInteraction = async (fileName: string) => {
        const interactionRef = ref(storage, `interactions/${fileName}_interactions.txt`);
        try {
            const fileExists = await fileExistsInStorage(fileName, 'interactions');
            if (!fileExists) {
                await createEmptyFile(interactionRef, '{}');  // Crear archivo vacío con '{}' si no existe
                return null;
            }

            const bytes = await getBytes(interactionRef);
            const interactions = JSON.parse(new TextDecoder().decode(bytes));
            const userId = getUserId();
            return interactions[userId] || null;
        } catch (error) {
                console.error("Error fetching user interaction:", error);
                return null;
        }
    };

    const fileExistsInStorage = async (fileName: string, folder: string) => {
        const listRef = ref(storage, `${folder}/`);
        try {
            const res = await listAll(listRef);
            return res.items.some((itemRef) => itemRef.name === `${fileName}_${folder}.txt`);
        } catch (error) {
            console.error("Error checking file existence:", error);
            return false;
        }
    };
    
    const createEmptyFile = async (fileRef: StorageReference, content: string) => {
        try {
            console.log("fileRef: ", fileRef);
            await uploadString(fileRef, content);
        } catch (error) {
            console.error("Error creating empty file:", error);
        }
    };

    const updateCount = async (url: string, type: 'likes' | 'dislikes') => {
        const fileName = getFileNameFromUrl(url);
        const currentInteraction = userInteractions[url];
        
        if (currentInteraction === type) {
            return; // Si el usuario ya hizo esta acción, no hacer nada
        }
    
        const oppositeType = type === 'likes' ? 'dislikes' : 'likes';
        // Actualizar el contador del tipo seleccionado
        const countRef = ref(storage, `counts/${fileName}_${type}.txt`);
        const oppositeCountRef = ref(storage, `counts/${fileName}_${oppositeType}.txt`);
    
        try {
            // Obtener el contador actual de Firebase
            let currentCount = await fetchCount(url, type);
            let oppositeCurrentCount = await fetchCount(url, oppositeType);
    
            // Incrementar el contador del tipo seleccionado
            currentCount += 1;
    
            // Si el usuario había interactuado con el tipo opuesto, disminuir el contador opuesto
            if (currentInteraction === oppositeType) {
                oppositeCurrentCount = Math.max(oppositeCurrentCount - 1, 0);
                await uploadString(oppositeCountRef, oppositeCurrentCount.toString());
            }
    
            // Guardar los nuevos valores en Firebase Storage
            await uploadString(countRef, currentCount.toString());
    
            // Actualizar el estado local con los nuevos valores
            setLikes((prev) => ({ ...prev, [url]: type === 'likes' ? currentCount : oppositeCurrentCount }));
            setDislikes((prev) => ({ ...prev, [url]: type === 'dislikes' ? currentCount : oppositeCurrentCount }));
    
            // Guardar la nueva interacción del usuario en Firebase Storage
            await saveUserInteraction(fileName, type);
            setUserInteractions((prev) => ({ ...prev, [url]: type }));
        } catch (error) {
            console.error("Error updating count:", error);
        }
    };


    const saveUserInteraction = async (fileName: string, type: 'likes' | 'dislikes') => {
        const interactionRef = ref(storage, `interactions/${fileName}_interactions.txt`);
        try {
            const userId = getUserId();
            const bytes = await getBytes(interactionRef).catch(() => null);
            const interactions = bytes ? JSON.parse(new TextDecoder().decode(bytes)) : {};
            interactions[userId] = type;
            await uploadString(interactionRef, JSON.stringify(interactions));
        } catch (error) {
            console.error("Error saving user interaction:", error);
        }
    };
    
    const getUserId = () => {
        let userId = localStorage.getItem('user_id');
        if (!userId) {
            userId = `user_${Math.random().toString(36).substr(2, 9)}`;
            localStorage.setItem('user_id', userId);
        }
        return userId;
    };

    const getFileNameFromUrl = (url: string) => {
        return url.substring(url.lastIndexOf('/') + 1, url.indexOf('?'));
    };

    return (
        <div>
            {photos.map((url, index) => (
                <div key={index} style={{ margin: '10px', border: '1px solid #ddd', padding: '10px' }}>
                    <img src={url} alt="Uploaded pic" style={{ width: '200px', height: '200px' }} />
                    <div>
                        <button onClick={() => updateCount(url, 'likes')} disabled={userInteractions[url] === 'likes'}>
                            Like
                        </button>
                        <span>{likes[url] || 0} Likes</span>
                    </div>
                    <div>
                        <button onClick={() => updateCount(url, 'dislikes')} disabled={userInteractions[url] === 'dislikes'}>
                            Dislike
                        </button>
                        <span>{dislikes[url] || 0} Dislikes</span>
                    </div>
                </div>
            ))}
        </div>
    );
};

export default Gallery;
