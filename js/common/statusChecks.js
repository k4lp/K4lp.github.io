import { getCredentials, getVendors, setVendorStatus } from './credentials.js';

const DIGIKEY_TOKEN_ENDPOINT = 'https://api.digikey.com/v1/oauth2/token';
const MOUSER_KEYWORD_ENDPOINT = 'https://api.mouser.com/api/v1/search/keyword';

const toQueryString = (params) => {
  const form = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      form.append(key, value);
    }
  });
  return form.toString();
};

const safeJson = async (response) => {
  try {
    return await response.clone().json();
  } catch (_error) {
    return null;
  }
};

const checkDigiKey = async (credentials) => {
  const clientId = credentials.clientId?.trim();
  const clientSecret = credentials.clientSecret?.trim();

  if (!clientId || !clientSecret) {
    return {
      status: 'Inactive',
      detail: 'Client ID and secret are required to request Digi-Key tokens.',
    };
  }

  try {
    const body = toQueryString({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'client_credentials',
    });

    const response = await fetch(DIGIKEY_TOKEN_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body,
      cache: 'no-store',
      mode: 'cors',
      credentials: 'omit',
    });

    if (response.ok) {
      const payload = await safeJson(response);
      const expiresIn = payload?.expires_in;
      const detail =
        typeof expiresIn === 'number'
          ? `Access token issued (~${Math.max(1, Math.round(expiresIn / 60))} minute lifespan).`
          : 'Access token request succeeded.';
      return { status: 'Active', detail };
    }

    const payload = await safeJson(response);
    const detail =
      payload?.error_description ?? payload?.error ?? `Unexpected response (HTTP ${response.status}).`;

    return {
      status: 'Error',
      detail,
    };
  } catch (error) {
    return {
      status: 'Error',
      detail: error?.message ?? 'Network error while contacting Digi-Key.',
    };
  }
};

const checkMouser = async (credentials) => {
  const apiKey = credentials.apiKey?.trim();

  if (!apiKey) {
    return {
      status: 'Inactive',
      detail: 'API key required to query Mouser search endpoints.',
    };
  }

  const endpoint = `${MOUSER_KEYWORD_ENDPOINT}?apiKey=${encodeURIComponent(apiKey)}`;
  const payload = {
    SearchByKeywordRequest: {
      keyword: 'status probe',
      records: 1,
      startingRecord: 0,
      searchOptions: '',
      searchWithYourSignUpLanguage: '',
    },
  };

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      cache: 'no-store',
      mode: 'cors',
      credentials: 'omit',
    });

    const data = await safeJson(response);

    const errors = data?.Errors;
    if (!response.ok || (Array.isArray(errors) && errors.length > 0)) {
      const detail =
        errors?.[0]?.Message ?? errors?.[0]?.Code ?? `Unexpected response (HTTP ${response.status}).`;
      return { status: 'Error', detail };
    }

    const count = typeof data?.NumberOfResult === 'number' ? data.NumberOfResult : 'unknown';
    return {
      status: 'Active',
      detail: `Keyword ping succeeded (results: ${count}).`,
    };
  } catch (error) {
    return {
      status: 'Error',
      detail: error?.message ?? 'Network error while contacting Mouser.',
    };
  }
};

const CHECKERS = {
  digikey: checkDigiKey,
  mouser: checkMouser,
};

export const evaluateVendorStatus = async (vendor) => {
  const credentials = getCredentials();
  const checker = CHECKERS[vendor];
  if (!checker) {
    throw new Error(`No status evaluator registered for vendor "${vendor}"`);
  }

  const result = await checker(credentials[vendor] ?? {});
  setVendorStatus(vendor, result.status, result.detail);
  return result;
};

export const evaluateAllVendorStatuses = async () => {
  const vendors = getVendors();
  const results = await Promise.all(
    vendors.map(async (vendor) => {
      try {
        const outcome = await evaluateVendorStatus(vendor);
        return { vendor, ...outcome };
      } catch (error) {
        const detail = error?.message ?? 'Unexpected error.';
        setVendorStatus(vendor, 'Error', detail);
        return { vendor, status: 'Error', detail };
      }
    }),
  );
  return results;
};

export const evaluateSelectedStatuses = async (vendors) => {
  const uniqueVendors = [...new Set(vendors)];
  const results = [];

  for (const vendor of uniqueVendors) {
    try {
      const outcome = await evaluateVendorStatus(vendor);
      results.push({ vendor, ...outcome });
    } catch (error) {
      const detail = error?.message ?? 'Unexpected error.';
      setVendorStatus(vendor, 'Error', detail);
      results.push({ vendor, status: 'Error', detail });
    }
  }

  return results;
};
