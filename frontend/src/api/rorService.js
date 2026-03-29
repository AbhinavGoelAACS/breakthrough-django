/**
 * ROR (Research Organization Registry) API Service
 * Free, open-access global database of research organizations
 * API Documentation: https://ror.readme.io/docs/api-overview
 */

const ROR_API_BASE = 'https://api.ror.org/v2';

/**
 * Search for organizations by name/query
 * @param {string} query - Search term (organization name)
 * @param {number} limit - Maximum results to return (default: 10)
 * @returns {Promise<Array>} - Array of organization objects
 */
export const searchOrganizations = async (query, limit = 10) => {
  if (!query || query.trim().length < 2) {
    return [];
  }

  try {
    const encodedQuery = encodeURIComponent(query.trim());
    const response = await fetch(
      `${ROR_API_BASE}/organizations?query=${encodedQuery}`
    );

    if (!response.ok) {
      throw new Error(`ROR API error: ${response.status}`);
    }

    const data = await response.json();
    
    // Parse and transform the response
    const organizations = (data.items || []).slice(0, limit).map((item) => {
      // Get the display name (prefer ror_display type)
      const displayName = item.names?.find(n => n.types?.includes('ror_display'))?.value 
        || item.names?.[0]?.value 
        || 'Unknown';
      
      // Get country from location
      const country = item.locations?.[0]?.geonames_details?.country_name || '';
      
      // Get website
      const website = item.links?.find(l => l.type === 'website')?.value || '';

      return {
        id: item.id, // ROR ID (e.g., "https://ror.org/03ad39j10")
        rorId: item.id?.replace('https://ror.org/', '') || '',
        name: displayName,
        country,
        website,
        types: item.types || [],
      };
    });

    return organizations;
  } catch (error) {
    console.error('ROR API search error:', error);
    throw error;
  }
};

/**
 * Get organization details by ROR ID
 * @param {string} rorId - ROR ID (e.g., "03ad39j10" or full URL)
 * @returns {Promise<Object>} - Organization details
 */
export const getOrganization = async (rorId) => {
  try {
    // Handle both short ID and full URL
    const id = rorId.includes('ror.org') ? rorId : `https://ror.org/${rorId}`;
    const response = await fetch(`${ROR_API_BASE}/organizations/${encodeURIComponent(id)}`);

    if (!response.ok) {
      throw new Error(`ROR API error: ${response.status}`);
    }

    const item = await response.json();
    
    const displayName = item.names?.find(n => n.types?.includes('ror_display'))?.value 
      || item.names?.[0]?.value 
      || 'Unknown';
    
    return {
      id: item.id,
      rorId: item.id?.replace('https://ror.org/', '') || '',
      name: displayName,
      country: item.locations?.[0]?.geonames_details?.country_name || '',
      website: item.links?.find(l => l.type === 'website')?.value || '',
      types: item.types || [],
    };
  } catch (error) {
    console.error('ROR API get error:', error);
    throw error;
  }
};

export default {
  searchOrganizations,
  getOrganization,
};
