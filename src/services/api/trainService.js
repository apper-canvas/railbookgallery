import { getApperClient } from '@/services/apperClient';

const trainService = {
  async searchTrains(searchParams) {
    const { origin, destination, journeyDate, travelClass } = searchParams;
    
    if (!origin || !destination) {
      return [];
    }

    try {
      const apperClient = getApperClient();
      let whereConditions = [
        {
          "FieldName": "origin_c",
          "Operator": "EqualTo",
          "Values": [origin]
        },
        {
          "FieldName": "destination_c",
          "Operator": "EqualTo",
          "Values": [destination]
        }
      ];

      if (travelClass) {
        whereConditions.push({
          "FieldName": "classes_c",
          "Operator": "Contains",
          "Values": [travelClass]
        });
      }

      const response = await apperClient.fetchRecords('train_c', {
        fields: [
          {"field": {"Name": "Name"}},
          {"field": {"Name": "train_number_c"}},
          {"field": {"Name": "train_name_c"}},
          {"field": {"Name": "origin_c"}},
          {"field": {"Name": "destination_c"}},
          {"field": {"Name": "departure_time_c"}},
          {"field": {"Name": "arrival_time_c"}},
          {"field": {"Name": "duration_c"}},
          {"field": {"Name": "classes_c"}},
          {"field": {"Name": "available_seats_c"}},
          {"field": {"Name": "fare_c"}}
        ],
        where: whereConditions
      });

      if (!response.success) {
        console.error(response.message);
        return [];
      }

      return (response.data || []).map(train => ({
        ...train,
        // Parse JSON fields
        classes: train.classes_c ? JSON.parse(train.classes_c) : [],
        availableSeats: train.available_seats_c ? JSON.parse(train.available_seats_c) : {},
        fare: train.fare_c ? JSON.parse(train.fare_c) : {}
      }));
    } catch (error) {
      console.error("Error searching trains:", error?.response?.data?.message || error);
      return [];
    }
  },

  async getById(id) {
    try {
      const apperClient = getApperClient();
      const response = await apperClient.getRecordById('train_c', parseInt(id), {
        fields: [
          {"field": {"Name": "Name"}},
          {"field": {"Name": "train_number_c"}},
          {"field": {"Name": "train_name_c"}},
          {"field": {"Name": "origin_c"}},
          {"field": {"Name": "destination_c"}},
          {"field": {"Name": "departure_time_c"}},
          {"field": {"Name": "arrival_time_c"}},
          {"field": {"Name": "duration_c"}},
          {"field": {"Name": "classes_c"}},
          {"field": {"Name": "available_seats_c"}},
          {"field": {"Name": "fare_c"}}
        ]
      });

      if (!response.success) {
        console.error(response.message);
        return null;
      }

      const train = response.data;
      if (!train) return null;

      return {
        ...train,
        // Parse JSON fields
        classes: train.classes_c ? JSON.parse(train.classes_c) : [],
        availableSeats: train.available_seats_c ? JSON.parse(train.available_seats_c) : {},
        fare: train.fare_c ? JSON.parse(train.fare_c) : {}
      };
    } catch (error) {
      console.error("Error fetching train:", error?.response?.data?.message || error);
      return null;
    }
  },

  async getByTrainNumber(trainNumber) {
    try {
      const apperClient = getApperClient();
      const response = await apperClient.fetchRecords('train_c', {
        fields: [
          {"field": {"Name": "Name"}},
          {"field": {"Name": "train_number_c"}},
          {"field": {"Name": "train_name_c"}},
          {"field": {"Name": "origin_c"}},
          {"field": {"Name": "destination_c"}},
          {"field": {"Name": "departure_time_c"}},
          {"field": {"Name": "arrival_time_c"}},
          {"field": {"Name": "duration_c"}},
          {"field": {"Name": "classes_c"}},
          {"field": {"Name": "available_seats_c"}},
          {"field": {"Name": "fare_c"}}
        ],
        where: [
          {
            "FieldName": "train_number_c",
            "Operator": "EqualTo",
            "Values": [trainNumber]
          }
        ]
      });

      if (!response.success) {
        console.error(response.message);
        return null;
      }

      const train = response.data && response.data.length > 0 ? response.data[0] : null;
      if (!train) return null;

      return {
        ...train,
        // Parse JSON fields
        classes: train.classes_c ? JSON.parse(train.classes_c) : [],
        availableSeats: train.available_seats_c ? JSON.parse(train.available_seats_c) : {},
        fare: train.fare_c ? JSON.parse(train.fare_c) : {}
      };
    } catch (error) {
      console.error("Error fetching train by number:", error?.response?.data?.message || error);
      return null;
    }
  },

  async getSeatLayout(trainId, travelClass) {
    const train = await this.getById(trainId);
    if (!train || !train.classes.includes(travelClass)) {
      return null;
    }

    // Generate seat layout based on class
    const layouts = {
      '1A': this.generateSeatLayout('1A', 4, 6),
      '2A': this.generateSeatLayout('2A', 6, 8), 
      '3A': this.generateSeatLayout('3A', 8, 9),
      'SL': this.generateSeatLayout('SL', 12, 8),
      'CC': this.generateSeatLayout('CC', 4, 12),
      'EC': this.generateSeatLayout('EC', 2, 12)
    };

    return layouts[travelClass] || null;
  },

  generateSeatLayout(travelClass, coachCount, seatsPerCoach) {
    const coaches = [];
    
    for (let i = 1; i <= coachCount; i++) {
      const coachName = `${travelClass.charAt(0)}${i}`;
      const seats = [];
      
      for (let j = 1; j <= seatsPerCoach; j++) {
        seats.push({
          seatNumber: `${coachName}-${j}`,
          status: Math.random() > 0.3 ? 'available' : 'occupied',
          type: this.getSeatType(travelClass, j)
        });
      }
      
      coaches.push({
        coachName,
        seats
      });
    }
    
    return coaches;
  },

  getSeatType(travelClass, seatNumber) {
    if (travelClass === 'CC' || travelClass === 'EC') {
      return 'chair';
    }
    
    const berths = ['Lower', 'Middle', 'Upper', 'Side Lower', 'Side Upper'];
    return berths[seatNumber % berths.length];
  },

  async getTrainStatus(trainNumber) {
    const train = await this.getByTrainNumber(trainNumber);
    if (!train) return null;

    // Mock live status
    const statuses = ['On Time', 'Delayed by 15 min', 'Delayed by 30 min', 'Delayed by 1 hr', 'Cancelled'];
    const randomStatus = statuses[Math.floor(Math.random() * statuses.length)];

    return {
      ...train,
      currentStatus: randomStatus,
      lastUpdated: new Date().toISOString(),
      nextStation: 'Intermediate Station',
      platform: Math.floor(Math.random() * 10) + 1
    };
  }
};

export default trainService;
export default trainService;