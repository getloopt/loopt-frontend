import type { NextApiRequest, NextApiResponse } from 'next';
import  {adminDB}  from '@/lib/firebaseAdmin';
import sampleTable from '../../../data/sampletable';

// This is the main handler for your API route.
// It will be executed every time a request is made to /api/mistralbackend
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  console.log('API route called with method:', req.method);

  // We only want to handle POST requests for this endpoint.
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ message: `Method ${req.method} Not Allowed` });
  }

  try {
    // Log the request body
    console.log('Request body:', req.body);
    const { imageUrl, email } = req.body;

    if (!imageUrl || !email) {
      return res.status(400).json({ 
        message: 'Missing required fields',
        received: { imageUrl: !!imageUrl, email: !!email }
      });
    }

    // Verify adminDB is initialized
    if (!adminDB) {
      throw new Error('Firebase Admin DB not initialized');
    }

    const timetableData = {
      ...sampleTable,
      email: email,
      imageUrl: imageUrl,
      createdAt: new Date().toISOString()
    };

    try {
      // First try to get the existing document
      const snap = await adminDB
        .collection('TimeTable')
        .where('email', '==', email)
        .get();

      if (snap.empty) {
        const docRef = await adminDB.collection('TimeTable').add(timetableData);
        console.log('Created new document:', docRef.id);
        return res.status(200).json({ 
          success: true,
          message: 'Created new timetable',
          docId: docRef.id
        });
      } else {
        await snap.docs[0].ref.update(timetableData);
        console.log('Updated document:', snap.docs[0].id);
        return res.status(200).json({ 
          success: true,
          message: 'Updated existing timetable',
          docId: snap.docs[0].id
        });
      }
    } catch (dbError: any) {
      console.error('Database operation failed:', dbError);
      return res.status(500).json({ 
        success: false,
        message: 'Database operation failed',
        error: dbError.message
      });
    }
  } catch (error: any) {
    console.error('API route error:', error);
    return res.status(500).json({ 
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
}







