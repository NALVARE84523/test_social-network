import React, { useState, useEffect } from 'react';
import { storage } from '../services/firebaseConfig';
import { ref, getBytes, uploadString, listAll, getMetadata } from 'firebase/storage';

interface GalleryProps {
    photos: string[];
}

const Gallery: React.FC<GalleryProps> = ({ photos }) => {
    const [likes, setLikes] = useState<{ [key: string]: number }>({});
    const [dislikes, setDislikes] = useState<{ [key: string]: number }>({});
    const [userInteractions, setUserInteractions] = useState<{ [key: string]: 'like' | 'dislike' | null }>({});

    useEffect(() => {
        photos.forEach(async (url) => {
            const fileName = getFileNameFromUrl(url);
    
            // Crear archivos de contadores para la nueva imagen
            await ensureCountFilesExist(fileName, 'likes');
            await ensureCountFilesExist(fileName, 'dislikes');
    
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

    const ensureCountFilesExist = async (fileName: string, type: 'likes' | 'dislikes') => {
        const countRef = ref(storage, `counts/${fileName}_${type}.txt`);
        try {
            const bytes = await getBytes(countRef);
            console.log(`Archivo ${type} ya existe con valor: `, new TextDecoder().decode(bytes));
        } catch (error) {
            if (error.code === 'storage/object-not-found') {
                console.log(`Archivo ${type} no encontrado para ${fileName}. Creando con valor 0.`);
                await createEmptyFile(countRef, '0');
            } else {
                console.error(`Error asegurando existencia de archivo ${type} para ${fileName}:`, error);
            }
        }
    };
    
    const fetchCount = async (url: string, type: 'likes' | 'dislikes') => {
        const fileName = getFileNameFromUrl(url);
        const countRef = ref(storage, `counts/${fileName}_${type}.txt`);
        try {
            // Intentar leer los bytes del archivo directamente
            const bytes = await getBytes(countRef);
            const count = parseInt(new TextDecoder().decode(bytes), 10);
            console.log(`fetchCount - ${type}: `, count); // Mostrar el conteo leído
            return isNaN(count) ? 0 : count;
        } catch (error) {
            if (error.code === 'storage/object-not-found') {
                // Si el archivo no existe, crearlo con un valor inicial de 0
                console.log(`Archivo no encontrado. Creando archivo ${type} con valor 0.`);
                await createEmptyFile(countRef, '0');
                return 0;
            } else {
                console.error(`Failed to fetch ${type} count for ${url}:`, error);
                return 0;
            }
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
    
    const createEmptyFile = async (fileRef: any, content: string) => {
        try {
            await uploadString(fileRef, content);
        } catch (error) {
            console.error("Error creating empty file:", error);
        }
    };

    const updateCount = async (url: string, type: 'likes' | 'dislikes') => {
        console.log("url: ", url); // url:  https://firebasestorage.googleapis.com/v0/b/gallery-react-4e1f7.appspot.com/o/images%2F1725045651805_logoVass2.png?alt=media&token=9f0fd00e-9a20-4fa4-8c52-9d5bc4d2df8f
        console.log("type: ", type); // type:  likes
        const fileName = getFileNameFromUrl(url);
        console.log("fileName: ", fileName); // fileName:  images%2F1725045651805_logoVass2.png
        const currentInteraction = userInteractions[url];
        console.log("currentInteraction: ", currentInteraction); // currentInteraction:  null
        
        if (currentInteraction === type) {
            console.log("if: currentInteraction === type");
            return; // Si el usuario ya hizo esta acción, no hacer nada
        }
    
        const oppositeType = type === 'likes' ? 'dislikes' : 'likes';
        console.log("oppositeType: ", oppositeType); // oppositeType:  dislikes
        // Actualizar el contador del tipo seleccionado
        const countRef = ref(storage, `counts/${fileName}_${type}.txt`);
        console.log("countRef: ", countRef); // countRef:  _Reference{_service: FirebaseStorageImpl, _location: _Location}
        const oppositeCountRef = ref(storage, `counts/${fileName}_${oppositeType}.txt`);
        console.log("oppositeCountRef: ", oppositeCountRef); // oppositeCountRef:  _Reference{_service: FirebaseStorageImpl, _location: _Location}
    
        try {
            // Obtener el contador actual de Firebase
            let currentCount = await fetchCount(url, type);
            console.log("currentCount: ", currentCount); // currentCount:  0
            let oppositeCurrentCount = await fetchCount(url, oppositeType);
            console.log("oppositeCurrentCount: ", oppositeCurrentCount); // oppositeCurrentCount:  0
    
            // Incrementar el contador del tipo seleccionado
            currentCount += 1;
            console.log("currentCount: ", currentCount); // currentCount:  1
    
            // Si el usuario había interactuado con el tipo opuesto, disminuir el contador opuesto
            if (currentInteraction === oppositeType) {
                console.log("if: currentInteraction === oppositeType");
                oppositeCurrentCount = Math.max(oppositeCurrentCount - 1, 0);
                await uploadString(oppositeCountRef, oppositeCurrentCount.toString());
            }
    
            // Guardar los nuevos valores en Firebase Storage
            await uploadString(countRef, currentCount.toString());
            console.log("currentCount.toString(): ", currentCount.toString()); // currentCount.toString():  1
    
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
            let interactions = bytes ? JSON.parse(new TextDecoder().decode(bytes)) : {};
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
                        <button onClick={() => updateCount(url, 'dislikes')} disabled={userInteractions[url] === 'dislike'}>
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
