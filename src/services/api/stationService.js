import { getApperClient } from '@/services/apperClient';

const stationService = {
  async getAll() {
    try {
      const apperClient = getApperClient();
      const response = await apperClient.fetchRecords('station_c', {
        fields: [
          {"field": {"Name": "Name"}},
          {"field": {"Name": "name_c"}},
          {"field": {"Name": "city_c"}},
          {"field": {"Name": "code_c"}}
        ]
      });

      if (!response.success) {
        console.error(response.message);
        return [];
      }

      return response.data || [];
    } catch (error) {
      console.error("Error fetching stations:", error?.response?.data?.message || error);
      return [];
    }
  },

  async search(query) {
    if (!query || query.length < 2) return [];
    
    try {
      const apperClient = getApperClient();
      const response = await apperClient.fetchRecords('station_c', {
        fields: [
          {"field": {"Name": "Name"}},
          {"field": {"Name": "name_c"}},
          {"field": {"Name": "city_c"}},
          {"field": {"Name": "code_c"}}
        ],
        where: [
          {
            "FieldName": "name_c",
            "Operator": "Contains",
            "Values": [query.toLowerCase()]
          }
        ]
      });

      if (!response.success) {
        console.error(response.message);
        return [];
      }

      return response.data || [];
    } catch (error) {
      console.error("Error searching stations:", error?.response?.data?.message || error);
      return [];
    }
  },

  async getById(id) {
    try {
      const apperClient = getApperClient();
      const response = await apperClient.getRecordById('station_c', parseInt(id), {
        fields: [
          {"field": {"Name": "Name"}},
          {"field": {"Name": "name_c"}},
          {"field": {"Name": "city_c"}},
          {"field": {"Name": "code_c"}}
        ]
      });

      if (!response.success) {
        console.error(response.message);
        return null;
      }

      return response.data;
    } catch (error) {
      console.error("Error fetching station:", error?.response?.data?.message || error);
      return null;
    }
  },

  async getByCode(code) {
    try {
      const apperClient = getApperClient();
      const response = await apperClient.fetchRecords('station_c', {
        fields: [
          {"field": {"Name": "Name"}},
          {"field": {"Name": "name_c"}},
          {"field": {"Name": "city_c"}},
          {"field": {"Name": "code_c"}}
        ],
        where: [
          {
            "FieldName": "code_c",
            "Operator": "EqualTo",
            "Values": [code]
          }
        ]
      });

      if (!response.success) {
        console.error(response.message);
        return null;
      }

      return response.data && response.data.length > 0 ? response.data[0] : null;
    } catch (error) {
      console.error("Error fetching station by code:", error?.response?.data?.message || error);
      return null;
    }
  }
};

export default stationService;