import { getApperClient } from '@/services/apperClient';
import trainService from './trainService';

const bookingService = {
  async getAll() {
    try {
      const apperClient = getApperClient();
      const response = await apperClient.fetchRecords('booking_c', {
        fields: [
          {"field": {"Name": "Name"}},
          {"field": {"Name": "pnr_c"}},
          {"field": {"Name": "train_number_c"}},
          {"field": {"Name": "train_name_c"}},
          {"field": {"Name": "journey_date_c"}},
          {"field": {"Name": "origin_c"}},
          {"field": {"Name": "destination_c"}},
          {"field": {"Name": "departure_time_c"}},
          {"field": {"Name": "arrival_time_c"}},
          {"field": {"Name": "passengers_c"}},
          {"field": {"Name": "seat_numbers_c"}},
          {"field": {"Name": "class_c"}},
          {"field": {"Name": "fare_c"}},
          {"field": {"Name": "booking_date_c"}},
          {"field": {"Name": "status_c"}}
        ]
      });

      if (!response.success) {
        console.error(response.message);
        return [];
      }

      return (response.data || []).map(booking => ({
        ...booking,
        // Parse JSON fields
        passengers: booking.passengers_c ? JSON.parse(booking.passengers_c) : [],
        seatNumbers: booking.seat_numbers_c ? JSON.parse(booking.seat_numbers_c) : []
      }));
    } catch (error) {
      console.error("Error fetching bookings:", error?.response?.data?.message || error);
      return [];
    }
  },

  async getByPnr(pnr) {
    try {
      const apperClient = getApperClient();
      const response = await apperClient.fetchRecords('booking_c', {
        fields: [
          {"field": {"Name": "Name"}},
          {"field": {"Name": "pnr_c"}},
          {"field": {"Name": "train_number_c"}},
          {"field": {"Name": "train_name_c"}},
          {"field": {"Name": "journey_date_c"}},
          {"field": {"Name": "origin_c"}},
          {"field": {"Name": "destination_c"}},
          {"field": {"Name": "departure_time_c"}},
          {"field": {"Name": "arrival_time_c"}},
          {"field": {"Name": "passengers_c"}},
          {"field": {"Name": "seat_numbers_c"}},
          {"field": {"Name": "class_c"}},
          {"field": {"Name": "fare_c"}},
          {"field": {"Name": "booking_date_c"}},
          {"field": {"Name": "status_c"}}
        ],
        where: [
          {
            "FieldName": "pnr_c",
            "Operator": "EqualTo",
            "Values": [pnr]
          }
        ]
      });

      if (!response.success) {
        console.error(response.message);
        return null;
      }

      const booking = response.data && response.data.length > 0 ? response.data[0] : null;
      if (!booking) return null;

      return {
        ...booking,
        // Parse JSON fields
        passengers: booking.passengers_c ? JSON.parse(booking.passengers_c) : [],
        seatNumbers: booking.seat_numbers_c ? JSON.parse(booking.seat_numbers_c) : []
      };
    } catch (error) {
      console.error("Error fetching booking:", error?.response?.data?.message || error);
      return null;
    }
  },

  async downloadTicketPdf(booking) {
    try {
      const apperClient = getApperClient();

      const result = await apperClient.functions.invoke(import.meta.env.VITE_GENERATE_TICKET_PDF, {
        body: JSON.stringify(booking),
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!result.success) {
        console.info(`apper_info: Got an error in this function: ${import.meta.env.VITE_GENERATE_TICKET_PDF}. The response body is: ${JSON.stringify(result)}.`);
        throw new Error(result.error || 'Failed to generate PDF');
      }

      // Create download link
      const link = document.createElement('a');
      link.href = result.pdfData;
      link.download = result.filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      return result;
    } catch (error) {
      console.info(`apper_info: Got this error an this function: ${import.meta.env.VITE_GENERATE_TICKET_PDF}. The error is: ${error.message}`);
      throw error;
    }
  },

  async getUserBookings() {
    // In a production app, this would filter by user ID from authenticated user
    return this.getAll();
  },

  async createBooking(bookingData) {
    try {
      const apperClient = getApperClient();
      
      const bookingRecord = {
        Name: `Booking ${this.generatePnr()}`,
        pnr_c: this.generatePnr(),
        train_number_c: bookingData.trainNumber,
        train_name_c: bookingData.trainName,
        journey_date_c: bookingData.journeyDate,
        origin_c: bookingData.origin,
        destination_c: bookingData.destination,
        departure_time_c: bookingData.departureTime,
        arrival_time_c: bookingData.arrivalTime,
        passengers_c: JSON.stringify(bookingData.passengers),
        seat_numbers_c: JSON.stringify(bookingData.seatNumbers),
        class_c: bookingData.class,
        fare_c: bookingData.fare,
        booking_date_c: new Date().toISOString().split('T')[0],
        status_c: 'Confirmed'
      };

      const response = await apperClient.createRecord('booking_c', {
        records: [bookingRecord]
      });

      if (!response.success) {
        console.error(response.message);
        throw new Error(response.message);
      }

      if (response.results) {
        const successful = response.results.filter(r => r.success);
        const failed = response.results.filter(r => !r.success);
        
        if (failed.length > 0) {
          console.error(`Failed to create booking:`, failed);
          failed.forEach(record => {
            record.errors?.forEach(error => console.error(`${error.fieldLabel}: ${error}`));
          });
          throw new Error('Failed to create booking');
        }
        
        const newBooking = successful[0].data;
        return {
          ...newBooking,
          passengers: JSON.parse(newBooking.passengers_c),
          seatNumbers: JSON.parse(newBooking.seat_numbers_c)
        };
      }

      throw new Error('No results returned from booking creation');
    } catch (error) {
      console.error("Error creating booking:", error?.response?.data?.message || error);
      throw error;
    }
  },

  async cancelBooking(pnr) {
    try {
      const booking = await this.getByPnr(pnr);
      if (!booking) {
        throw new Error('Booking not found');
      }

      const refundAmount = this.calculateRefund(booking);
      
      const apperClient = getApperClient();
      const response = await apperClient.updateRecord('booking_c', {
        records: [{
          Id: booking.Id,
          status_c: 'Cancelled'
        }]
      });

      if (!response.success) {
        console.error(response.message);
        throw new Error(response.message);
      }

      if (response.results) {
        const successful = response.results.filter(r => r.success);
        const failed = response.results.filter(r => !r.success);
        
        if (failed.length > 0) {
          console.error(`Failed to cancel booking:`, failed);
          throw new Error('Failed to cancel booking');
        }
        
        return {
          booking: {
            ...booking,
            status_c: 'Cancelled'
          },
          refundAmount
        };
      }

      throw new Error('No results returned from booking cancellation');
    } catch (error) {
      console.error("Error cancelling booking:", error?.response?.data?.message || error);
      throw error;
    }
  },

  generatePnr() {
    return Math.floor(1000000000 + Math.random() * 9000000000).toString();
  },

  calculateRefund(booking) {
    const journeyDate = new Date(booking.journey_date_c);
    const today = new Date();
    const daysUntilJourney = Math.ceil((journeyDate - today) / (1000 * 60 * 60 * 24));
    
    let refundPercentage = 0;
    if (daysUntilJourney >= 1) {
      refundPercentage = 0.9; // 90% refund
    } else if (daysUntilJourney >= 0) {
      refundPercentage = 0.5; // 50% refund
    } else {
      refundPercentage = 0; // No refund for past journeys
    }
    
    return Math.floor(booking.fare_c * refundPercentage);
  },

  async calculateFare(trainId, travelClass, passengerCount) {
    const train = await trainService.getById(trainId);
    
    if (!train || !train.fare[travelClass]) {
      return { baseFare: 0, taxes: 0, total: 0 };
    }

    const baseFare = train.fare[travelClass] * passengerCount;
    const taxes = Math.floor(baseFare * 0.05); // 5% tax
    const total = baseFare + taxes;

    return { baseFare, taxes, total };
  }
};

export default bookingService;