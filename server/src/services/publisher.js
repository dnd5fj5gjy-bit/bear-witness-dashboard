import fs from 'node:fs';
import path from 'node:path';
import { getPostById, getAccountById, updatePostStatus, decryptToken } from '../db.js';

const log = (msg) => console.log(`[${new Date().toISOString()}] [publisher] ${msg}`);

// ---------------------------------------------------------------------------
// Meta (Facebook Pages + Instagram)
// ---------------------------------------------------------------------------

export async function publishToMeta(account, post) {
  const pageAccessToken = decryptToken(account.page_access_token);
  if (!pageAccessToken) {
    throw new Error('No page access token available');
  }

  const igUserId = account.ig_user_id;
  const pageId = account.page_id;

  // Determine if this is an Instagram or Facebook post
  if (igUserId) {
    return publishToInstagram(igUserId, pageAccessToken, post);
  } else if (pageId) {
    return publishToFacebookPage(pageId, pageAccessToken, post);
  } else {
    throw new Error('No page_id or ig_user_id found on this Meta account');
  }
}

async function publishToFacebookPage(pageId, accessToken, post) {
  const caption = post.caption || '';

  if (post.media_type === 'image' && post.media_path) {
    // Upload photo to Facebook Page
    log(`Publishing image to Facebook Page ${pageId}...`);

    const formData = new FormData();
    const fileBuffer = fs.readFileSync(post.media_path);
    const blob = new Blob([fileBuffer]);
    formData.append('source', blob, path.basename(post.media_path));
    formData.append('message', caption);
    formData.append('access_token', accessToken);

    const res = await fetch(`https://graph.facebook.com/v21.0/${pageId}/photos`, {
      method: 'POST',
      body: formData,
    });
    const data = await res.json();

    if (data.error) {
      throw new Error(`Facebook API error: ${data.error.message}`);
    }

    log(`Published photo to Facebook Page. Post ID: ${data.id || data.post_id}`);
    return data.id || data.post_id;
  }

  if (post.media_type === 'video' && post.media_path) {
    // Upload video to Facebook Page
    log(`Publishing video to Facebook Page ${pageId}...`);

    const formData = new FormData();
    const fileBuffer = fs.readFileSync(post.media_path);
    const blob = new Blob([fileBuffer]);
    formData.append('source', blob, path.basename(post.media_path));
    formData.append('description', caption);
    formData.append('access_token', accessToken);

    const res = await fetch(`https://graph.facebook.com/v21.0/${pageId}/videos`, {
      method: 'POST',
      body: formData,
    });
    const data = await res.json();

    if (data.error) {
      throw new Error(`Facebook API error: ${data.error.message}`);
    }

    log(`Published video to Facebook Page. Post ID: ${data.id}`);
    return data.id;
  }

  // Text-only post
  log(`Publishing text post to Facebook Page ${pageId}...`);
  const res = await fetch(`https://graph.facebook.com/v21.0/${pageId}/feed`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: caption,
      access_token: accessToken,
    }),
  });
  const data = await res.json();

  if (data.error) {
    throw new Error(`Facebook API error: ${data.error.message}`);
  }

  log(`Published text post to Facebook Page. Post ID: ${data.id}`);
  return data.id;
}

async function publishToInstagram(igUserId, accessToken, post) {
  const caption = post.caption || '';

  if (post.media_type === 'carousel') {
    return publishInstagramCarousel(igUserId, accessToken, post);
  }

  if (post.media_type === 'image' && post.media_path) {
    // Instagram requires a publicly accessible URL for images.
    // For local files, the server URL is used (the media must be served publicly or via a tunnel).
    const serverUrl = process.env.SERVER_URL || 'http://localhost:5181';
    const imageUrl = `${serverUrl}/uploads/${path.basename(post.media_path)}`;

    log(`Publishing image to Instagram ${igUserId}...`);

    // Step 1: Create media container
    const containerRes = await fetch(`https://graph.facebook.com/v21.0/${igUserId}/media`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        image_url: imageUrl,
        caption,
        access_token: accessToken,
      }),
    });
    const containerData = await containerRes.json();

    if (containerData.error) {
      throw new Error(`Instagram container error: ${containerData.error.message}`);
    }

    const containerId = containerData.id;
    log(`Instagram media container created: ${containerId}`);

    // Step 2: Wait for container to be ready, then publish
    await waitForInstagramContainer(igUserId, containerId, accessToken);

    const publishRes = await fetch(`https://graph.facebook.com/v21.0/${igUserId}/media_publish`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        creation_id: containerId,
        access_token: accessToken,
      }),
    });
    const publishData = await publishRes.json();

    if (publishData.error) {
      throw new Error(`Instagram publish error: ${publishData.error.message}`);
    }

    log(`Published image to Instagram. Post ID: ${publishData.id}`);
    return publishData.id;
  }

  if (post.media_type === 'video' && post.media_path) {
    const serverUrl = process.env.SERVER_URL || 'http://localhost:5181';
    const videoUrl = `${serverUrl}/uploads/${path.basename(post.media_path)}`;

    log(`Publishing video (Reel) to Instagram ${igUserId}...`);

    // Create video container
    const containerRes = await fetch(`https://graph.facebook.com/v21.0/${igUserId}/media`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        media_type: 'REELS',
        video_url: videoUrl,
        caption,
        access_token: accessToken,
      }),
    });
    const containerData = await containerRes.json();

    if (containerData.error) {
      throw new Error(`Instagram video container error: ${containerData.error.message}`);
    }

    const containerId = containerData.id;
    log(`Instagram video container created: ${containerId}`);

    // Wait for processing then publish
    await waitForInstagramContainer(igUserId, containerId, accessToken, 60);

    const publishRes = await fetch(`https://graph.facebook.com/v21.0/${igUserId}/media_publish`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        creation_id: containerId,
        access_token: accessToken,
      }),
    });
    const publishData = await publishRes.json();

    if (publishData.error) {
      throw new Error(`Instagram video publish error: ${publishData.error.message}`);
    }

    log(`Published video to Instagram. Post ID: ${publishData.id}`);
    return publishData.id;
  }

  throw new Error('Instagram requires media (image or video) for posts');
}

async function publishInstagramCarousel(igUserId, accessToken, post) {
  // Carousel: media_path should contain comma-separated file paths
  const mediaPaths = post.media_path.split(',').map(p => p.trim());
  const serverUrl = process.env.SERVER_URL || 'http://localhost:5181';
  const caption = post.caption || '';

  log(`Publishing carousel (${mediaPaths.length} items) to Instagram ${igUserId}...`);

  // Step 1: Create individual item containers
  const containerIds = [];
  for (const mediaPath of mediaPaths) {
    const imageUrl = `${serverUrl}/uploads/${path.basename(mediaPath)}`;
    const itemRes = await fetch(`https://graph.facebook.com/v21.0/${igUserId}/media`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        image_url: imageUrl,
        is_carousel_item: true,
        access_token: accessToken,
      }),
    });
    const itemData = await itemRes.json();

    if (itemData.error) {
      throw new Error(`Instagram carousel item error: ${itemData.error.message}`);
    }
    containerIds.push(itemData.id);
  }

  // Step 2: Create carousel container
  const carouselRes = await fetch(`https://graph.facebook.com/v21.0/${igUserId}/media`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      media_type: 'CAROUSEL',
      children: containerIds.join(','),
      caption,
      access_token: accessToken,
    }),
  });
  const carouselData = await carouselRes.json();

  if (carouselData.error) {
    throw new Error(`Instagram carousel container error: ${carouselData.error.message}`);
  }

  // Step 3: Publish carousel
  await waitForInstagramContainer(igUserId, carouselData.id, accessToken);

  const publishRes = await fetch(`https://graph.facebook.com/v21.0/${igUserId}/media_publish`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      creation_id: carouselData.id,
      access_token: accessToken,
    }),
  });
  const publishData = await publishRes.json();

  if (publishData.error) {
    throw new Error(`Instagram carousel publish error: ${publishData.error.message}`);
  }

  log(`Published carousel to Instagram. Post ID: ${publishData.id}`);
  return publishData.id;
}

/**
 * Poll Instagram container status until it's ready or we time out.
 */
async function waitForInstagramContainer(igUserId, containerId, accessToken, maxAttempts = 30) {
  for (let i = 0; i < maxAttempts; i++) {
    const statusRes = await fetch(
      `https://graph.facebook.com/v21.0/${containerId}?fields=status_code&access_token=${accessToken}`
    );
    const statusData = await statusRes.json();

    if (statusData.status_code === 'FINISHED') {
      return;
    }
    if (statusData.status_code === 'ERROR') {
      throw new Error('Instagram media container processing failed');
    }

    // Wait 2 seconds before checking again
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  throw new Error('Instagram media container processing timed out');
}

// ---------------------------------------------------------------------------
// LinkedIn
// ---------------------------------------------------------------------------

export async function publishToLinkedIn(account, post) {
  const accessToken = decryptToken(account.access_token);
  if (!accessToken) {
    throw new Error('No access token available');
  }

  const personUrn = `urn:li:person:${account.platform_user_id}`;
  const caption = post.caption || '';

  if ((post.media_type === 'image' || post.media_type === 'video') && post.media_path) {
    return publishLinkedInWithMedia(personUrn, accessToken, post);
  }

  // Text-only post
  log(`Publishing text post to LinkedIn...`);
  const res = await fetch('https://api.linkedin.com/v2/ugcPosts', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'X-Restli-Protocol-Version': '2.0.0',
    },
    body: JSON.stringify({
      author: personUrn,
      lifecycleState: 'PUBLISHED',
      specificContent: {
        'com.linkedin.ugc.ShareContent': {
          shareCommentary: { text: caption },
          shareMediaCategory: 'NONE',
        },
      },
      visibility: {
        'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC',
      },
    }),
  });

  const data = await res.json();
  if (res.status >= 400) {
    throw new Error(`LinkedIn API error: ${JSON.stringify(data)}`);
  }

  const postId = data.id || res.headers.get('x-restli-id');
  log(`Published text post to LinkedIn. Post ID: ${postId}`);
  return postId;
}

async function publishLinkedInWithMedia(personUrn, accessToken, post) {
  const caption = post.caption || '';
  const isVideo = post.media_type === 'video';
  const recipeType = isVideo
    ? 'urn:li:digitalmediaRecipe:feedshare-video'
    : 'urn:li:digitalmediaRecipe:feedshare-image';

  // Step 1: Register upload
  log(`Registering LinkedIn ${post.media_type} upload...`);
  const registerRes = await fetch('https://api.linkedin.com/v2/assets?action=registerUpload', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      registerUploadRequest: {
        recipes: [recipeType],
        owner: personUrn,
        serviceRelationships: [
          {
            relationshipType: 'OWNER',
            identifier: 'urn:li:userGeneratedContent',
          },
        ],
      },
    }),
  });
  const registerData = await registerRes.json();

  if (registerRes.status >= 400) {
    throw new Error(`LinkedIn register upload error: ${JSON.stringify(registerData)}`);
  }

  const uploadUrl = registerData.value?.uploadMechanism?.['com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest']?.uploadUrl;
  const asset = registerData.value?.asset;

  if (!uploadUrl || !asset) {
    throw new Error('Failed to get LinkedIn upload URL');
  }

  // Step 2: Upload the file
  log(`Uploading ${post.media_type} to LinkedIn...`);
  const fileBuffer = fs.readFileSync(post.media_path);
  const uploadRes = await fetch(uploadUrl, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/octet-stream',
    },
    body: fileBuffer,
  });

  if (uploadRes.status >= 400) {
    throw new Error(`LinkedIn file upload failed with status ${uploadRes.status}`);
  }

  // Step 3: Create the post with the uploaded media
  log(`Creating LinkedIn post with ${post.media_type}...`);
  const postRes = await fetch('https://api.linkedin.com/v2/ugcPosts', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'X-Restli-Protocol-Version': '2.0.0',
    },
    body: JSON.stringify({
      author: personUrn,
      lifecycleState: 'PUBLISHED',
      specificContent: {
        'com.linkedin.ugc.ShareContent': {
          shareCommentary: { text: caption },
          shareMediaCategory: isVideo ? 'VIDEO' : 'IMAGE',
          media: [
            {
              status: 'READY',
              media: asset,
            },
          ],
        },
      },
      visibility: {
        'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC',
      },
    }),
  });

  const postData = await postRes.json();
  if (postRes.status >= 400) {
    throw new Error(`LinkedIn post creation error: ${JSON.stringify(postData)}`);
  }

  const postId = postData.id || postRes.headers.get('x-restli-id');
  log(`Published ${post.media_type} to LinkedIn. Post ID: ${postId}`);
  return postId;
}

// ---------------------------------------------------------------------------
// X / Twitter
// ---------------------------------------------------------------------------

export async function publishToTwitter(account, post) {
  const accessToken = decryptToken(account.access_token);
  if (!accessToken) {
    throw new Error('No access token available');
  }

  const caption = post.caption || '';
  let mediaIds = [];

  // Upload media if present
  if ((post.media_type === 'image' || post.media_type === 'video') && post.media_path) {
    const mediaId = await uploadTwitterMedia(accessToken, post.media_path, post.media_type);
    mediaIds.push(mediaId);
  }

  // Create tweet
  log('Creating tweet...');
  const tweetBody = { text: caption };
  if (mediaIds.length > 0) {
    tweetBody.media = { media_ids: mediaIds };
  }

  const res = await fetch('https://api.twitter.com/2/tweets', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(tweetBody),
  });
  const data = await res.json();

  if (data.errors) {
    throw new Error(`Twitter API error: ${data.errors[0]?.message || JSON.stringify(data.errors)}`);
  }
  if (res.status >= 400) {
    throw new Error(`Twitter API error (${res.status}): ${JSON.stringify(data)}`);
  }

  log(`Published tweet. ID: ${data.data?.id}`);
  return data.data?.id;
}

async function uploadTwitterMedia(accessToken, mediaPath, mediaType) {
  // Twitter v1.1 media upload (still required for media)
  // Note: Twitter OAuth 2.0 user tokens work with v1.1 media upload
  const fileBuffer = fs.readFileSync(mediaPath);
  const totalBytes = fileBuffer.length;
  const mimeType = mediaType === 'video' ? 'video/mp4' : 'image/jpeg';

  log(`Uploading media to Twitter (${totalBytes} bytes)...`);

  if (mediaType === 'image' && totalBytes < 5 * 1024 * 1024) {
    // Simple upload for small images
    const formData = new FormData();
    const blob = new Blob([fileBuffer]);
    formData.append('media', blob, path.basename(mediaPath));
    formData.append('media_category', 'tweet_image');

    const res = await fetch('https://upload.twitter.com/1.1/media/upload.json', {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` },
      body: formData,
    });
    const data = await res.json();

    if (data.errors) {
      throw new Error(`Twitter media upload error: ${JSON.stringify(data.errors)}`);
    }

    log(`Twitter media uploaded. Media ID: ${data.media_id_string}`);
    return data.media_id_string;
  }

  // Chunked upload for large files / videos
  // INIT
  const initRes = await fetch('https://upload.twitter.com/1.1/media/upload.json', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      command: 'INIT',
      total_bytes: String(totalBytes),
      media_type: mimeType,
      media_category: mediaType === 'video' ? 'tweet_video' : 'tweet_image',
    }),
  });
  const initData = await initRes.json();

  if (!initData.media_id_string) {
    throw new Error(`Twitter media INIT failed: ${JSON.stringify(initData)}`);
  }

  const mediaId = initData.media_id_string;

  // APPEND — upload in 5MB chunks
  const chunkSize = 5 * 1024 * 1024;
  let segmentIndex = 0;
  for (let offset = 0; offset < totalBytes; offset += chunkSize) {
    const chunk = fileBuffer.subarray(offset, Math.min(offset + chunkSize, totalBytes));
    const formData = new FormData();
    formData.append('command', 'APPEND');
    formData.append('media_id', mediaId);
    formData.append('segment_index', String(segmentIndex));
    const blob = new Blob([chunk]);
    formData.append('media_data', blob);

    await fetch('https://upload.twitter.com/1.1/media/upload.json', {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` },
      body: formData,
    });

    segmentIndex++;
  }

  // FINALIZE
  const finalizeRes = await fetch('https://upload.twitter.com/1.1/media/upload.json', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      command: 'FINALIZE',
      media_id: mediaId,
    }),
  });
  const finalizeData = await finalizeRes.json();

  // Check processing status for videos
  if (finalizeData.processing_info) {
    await waitForTwitterProcessing(accessToken, mediaId);
  }

  log(`Twitter media upload complete. Media ID: ${mediaId}`);
  return mediaId;
}

async function waitForTwitterProcessing(accessToken, mediaId, maxAttempts = 60) {
  for (let i = 0; i < maxAttempts; i++) {
    const statusRes = await fetch(
      `https://upload.twitter.com/1.1/media/upload.json?command=STATUS&media_id=${mediaId}`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    const statusData = await statusRes.json();

    const state = statusData.processing_info?.state;
    if (state === 'succeeded') return;
    if (state === 'failed') {
      throw new Error(`Twitter media processing failed: ${JSON.stringify(statusData.processing_info.error)}`);
    }

    const waitSeconds = statusData.processing_info?.check_after_secs || 5;
    await new Promise(resolve => setTimeout(resolve, waitSeconds * 1000));
  }
  throw new Error('Twitter media processing timed out');
}

// ---------------------------------------------------------------------------
// Main publish dispatcher
// ---------------------------------------------------------------------------

export async function publishPost(postId) {
  const post = getPostById(postId);
  if (!post) {
    return { success: false, error: 'Post not found' };
  }

  const account = getAccountById(post.account_id);
  if (!account) {
    updatePostStatus(postId, 'failed', { errorMessage: 'Account not found' });
    return { success: false, error: 'Account not found' };
  }

  // Mark as publishing
  updatePostStatus(postId, 'publishing');
  log(`Publishing post ${postId} to ${account.platform} (${account.name})...`);

  try {
    let platformPostId;

    switch (account.platform) {
      case 'meta':
        platformPostId = await publishToMeta(account, post);
        break;
      case 'linkedin':
        platformPostId = await publishToLinkedIn(account, post);
        break;
      case 'twitter':
        platformPostId = await publishToTwitter(account, post);
        break;
      default:
        throw new Error(`Publishing not implemented for platform: ${account.platform}`);
    }

    updatePostStatus(postId, 'published', {
      platformPostId: String(platformPostId),
      publishedAt: new Date().toISOString(),
    });

    log(`Post ${postId} published successfully. Platform ID: ${platformPostId}`);
    return { success: true, platformPostId };
  } catch (err) {
    const errorMessage = err.message || 'Unknown publishing error';
    updatePostStatus(postId, 'failed', { errorMessage });
    log(`Post ${postId} failed to publish: ${errorMessage}`);
    return { success: false, error: errorMessage };
  }
}
