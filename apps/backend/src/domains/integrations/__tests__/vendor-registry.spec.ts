import { Test, TestingModule } from '@nestjs/testing';
import { IntegrationsController } from '../integrations.controller';
import { IntegrationsService } from '../integrations.service';
import { VENDOR_REGISTRY } from '../vendor-registry';

describe('IntegrationsController - Vendor Registry', () => {
  let controller: IntegrationsController;

  const mockIntegrationsService = {
    // Mock other methods as needed
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [IntegrationsController],
      providers: [
        {
          provide: IntegrationsService,
          useValue: mockIntegrationsService,
        },
      ],
    }).compile();

    controller = module.get<IntegrationsController>(IntegrationsController);
  });

  describe('GET /vendors', () => {
    it('should return all vendors from registry', () => {
      const vendors = controller.getVendorRegistry();

      expect(vendors).toBeInstanceOf(Array);
      expect(vendors.length).toBe(9);

      // Verify PROJECT44_TMS is present
      const project44 = vendors.find((v) => v.id === 'PROJECT44_TMS');
      expect(project44).toBeDefined();
      expect(project44?.displayName).toBe('project44');
      expect(project44?.integrationType).toBe('TMS');
      expect(project44?.credentialFields).toHaveLength(2);

      // Verify SAMSARA_ELD is present
      const samsara = vendors.find((v) => v.id === 'SAMSARA_ELD');
      expect(samsara).toBeDefined();
      expect(samsara?.displayName).toBe('Samsara');
      expect(samsara?.credentialFields).toHaveLength(1);
      expect(samsara?.credentialFields[0].name).toBe('apiToken');
    });

    it('should include credential field metadata', () => {
      const vendors = controller.getVendorRegistry();
      const project44 = vendors.find((v) => v.id === 'PROJECT44_TMS');

      const clientIdField = project44?.credentialFields.find(
        (f) => f.name === 'clientId',
      );
      expect(clientIdField).toMatchObject({
        name: 'clientId',
        label: 'Client ID',
        type: 'text',
        required: true,
      });
      expect(clientIdField?.helpText).toContain('OAuth 2.0');
    });
  });
});
